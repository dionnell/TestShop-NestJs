import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  WebpayPlus,
  Options,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Environment,
} from 'transbank-sdk';
import { v4 as uuid } from 'uuid';

import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { User } from '../auth/entities/user.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');
  private readonly tx: InstanceType<typeof WebpayPlus.Transaction>;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    private readonly configService: ConfigService,
  ) {
    const isProduction = configService.get('TRANSBANK_ENV') === 'production';

    this.tx = new WebpayPlus.Transaction(
      isProduction
        ? new Options(
            configService.get('TRANSBANK_COMMERCE_CODE'),
            configService.get('TRANSBANK_API_KEY'),
            Environment.Production,
          )
        : new Options(
            IntegrationCommerceCodes.WEBPAY_PLUS,
            IntegrationApiKeys.WEBPAY,
            Environment.Integration,
          ),
    );
  }

  // ── Paso 1: leer carrito → crear transacción en Transbank → guardar payment con items ──
  async createTransaction(user: User) {
    this.logger.log(`Creating transaction for user: ${user.id}`);

    // QueryBuilder para evitar problemas con relaciones anidadas en el where
    const cartItems = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .leftJoinAndSelect('cartItem.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .innerJoin('cartItem.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .getMany();

    this.logger.log(`Cart items found: ${cartItems.length}`);

    if (cartItems.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Calcular total desde el carrito (fuente de verdad)
    const amount = +cartItems
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      .toFixed(2);

    const buyOrder = uuid().replace(/-/g, '').substring(0, 26);
    const sessionId = uuid().replace(/-/g, '').substring(0, 61);
    const returnUrl = `${this.configService.get('API_URL')}/payments/confirm`;

    try {
      const response = await this.tx.create(buyOrder, sessionId, amount, returnUrl);

      // Crear snapshot de los items del carrito
      const paymentItems = cartItems.map((cartItem) =>
        this.paymentItemRepository.create({
          product: cartItem.product,
          size: cartItem.size,
          quantity: cartItem.quantity,
          unitPrice: cartItem.product.price,
          subtotal: +(cartItem.product.price * cartItem.quantity).toFixed(2),
        }),
      );

      // Guardar payment con sus items
      await this.paymentRepository.save(
        this.paymentRepository.create({
          user,
          token: response.token,
          buyOrder,
          amount,
          status: 'pending',
          items: paymentItems,
        }),
      );

      return {
        url: response.url,
        token: response.token,
        amount,
        itemCount: cartItems.length,
      };
    } catch (error) {
      this.logger.error('Error creating Transbank transaction', error);
      throw new BadRequestException('No se pudo iniciar la transacción con Transbank');
    }
  }

  // ── Paso 2: Transbank redirige aquí → confirmamos → vaciamos carrito si fue aprobado ──
  async confirmTransaction(tokenWs: string) {
    if (!tokenWs) throw new BadRequestException('Token no recibido');

    const payment = await this.paymentRepository.findOne({
      where: { token: tokenWs },
    });
    if (!payment) throw new NotFoundException('Transacción no encontrada');

    try {
      const response = await this.tx.commit(tokenWs);
      const isApproved = response.response_code === 0;

      payment.status = isApproved ? 'approved' : 'failed';
      payment.transactionDetail = response;
      await this.paymentRepository.save(payment);

      // Si fue aprobado, vaciar el carrito del usuario
      if (isApproved) {
        await this.cartItemRepository
          .createQueryBuilder()
          .delete()
          .where('userId = :userId', { userId: payment.user.id })
          .execute();
      }

      return {
        success: isApproved,
        payment,
        detail: response,
      };
    } catch (error) {
      this.logger.error('Error confirming Transbank transaction', error);
      payment.status = 'failed';
      await this.paymentRepository.save(payment);
      throw new BadRequestException('Error al confirmar la transacción');
    }
  }

  // ── Historial de pagos del usuario con sus items ──
  async getUserPayments(user: User) {
    return this.paymentRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Detalle de un pago con sus items ──
  async getPaymentById(id: string, user: User) {
    const payment = await this.paymentRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }
}