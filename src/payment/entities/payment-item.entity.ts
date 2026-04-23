import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Payment } from './payment.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('payment_items')
export class PaymentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: 'CASCADE' })
  payment: Payment;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true, eager: true })
  product: Product;

  // Snapshot del precio al momento del pago
  @Column('float')
  unitPrice: number;

  @Column('text')
  size: string;

  @Column('int')
  quantity: number;

  @Column('float')
  subtotal: number;
}