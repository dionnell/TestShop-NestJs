import { Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
 
@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;
 
  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  user: User;
 
  @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
  product: Product;
 
  @CreateDateColumn()
  createdAt: Date;
}