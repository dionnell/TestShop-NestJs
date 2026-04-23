import { Controller, Post, Get, Body, Query, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { PaymentService } from './payment.service';
import { Auth, GetUser } from '../auth/decorators';
import { User } from '../auth/entities/user.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  // Paso 1: leer carrito del usuario autenticado e iniciar transacción
  @Post('create')
  @Auth()
  @ApiOperation({ summary: 'Initiate Webpay transaction from cart contents' })
  @ApiResponse({ status: 201, description: 'Returns Webpay url, token and amount' })
  createTransaction(@GetUser() user: User) {
    return this.paymentService.createTransaction(user);
  }

  // Paso 2: Transbank redirige aquí con token_ws tras el pago
  @Get('confirm')
  @ApiOperation({ summary: 'Transbank callback — confirms and redirects to frontend' })
  async confirmTransaction(
    @Query('token_ws') tokenWs: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL');

    try {
      const result = await this.paymentService.confirmTransaction(tokenWs);

      if (result.success) {
        return res.redirect(`${frontendUrl}/payment/success?orderId=${result.payment.buyOrder}`);
      } else {
        return res.redirect(`${frontendUrl}/payment/failed?orderId=${result.payment.buyOrder}`);
      }
    } catch (error) {
      return res.redirect(`${frontendUrl}/payment/failed`);
    }
  }

  // Historial de pagos del usuario autenticado
  @Get('my-payments')
  @Auth()
  @ApiOperation({ summary: 'Get payment history with items for the logged-in user' })
  getUserPayments(@GetUser() user: User) {
    return this.paymentService.getUserPayments(user);
  }

  // Detalle de un pago con sus items
  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Get payment detail with items by ID' })
  getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.paymentService.getPaymentById(id, user);
  }
}