import { Product } from './';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'product_images' })
export class ProductImage {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  url: string;

  @Column('text', { nullable: true })
  publicId: string;

  @Column('int', { default: 0 })
  order: number;

  @ManyToOne(
    () => Product,
    (product) => product.images,
    { onDelete: 'CASCADE' },
  )
  product: Product;
}
