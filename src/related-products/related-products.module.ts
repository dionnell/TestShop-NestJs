import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RelatedProductsController } from './related-products.controller';
import { RelatedProductsService } from './related-products.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ConfigModule, ProductsModule],
  controllers: [RelatedProductsController],
  providers: [RelatedProductsService],
})
export class RelatedProductsModule {}