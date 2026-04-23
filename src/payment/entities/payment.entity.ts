import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PaymentItem } from './payment-item.entity';

export type PaymentStatus = 'pending' | 'approved' | 'failed' | 'cancelled';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column('text', { unique: true })
  token: string;

  @Column('text', { unique: true })
  buyOrder: string;

  @Column('float')
  amount: number;

  @Column('text', { default: 'pending' })
  status: PaymentStatus;

  // Items del carrito al momento del pago (snapshot)
  @OneToMany(() => PaymentItem, (item) => item.payment, { cascade: true, eager: true })
  items: PaymentItem[];

  // Respuesta completa de Transbank al confirmar
  @Column('jsonb', { nullable: true })
  transactionDetail: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}