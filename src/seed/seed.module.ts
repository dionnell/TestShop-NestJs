import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './../auth/auth.module';
import { ProductsModule } from './../products/products.module';
import { FilesModule } from '../files/files.module';

import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    ConfigModule,
    ProductsModule,
    AuthModule,
    FilesModule,   // provides CloudinaryService
  ],
})
export class SeedModule {}
