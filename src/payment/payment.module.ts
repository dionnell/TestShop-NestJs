import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { AuthModule } from '../auth/auth.module';
import { CartItem } from '../cart/entities/cart-item.entity';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentItem, CartItem]),
    AuthModule,
    ConfigModule,
  ],
})
export class PaymentModule {}