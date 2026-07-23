import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { CloudinaryService } from './cloudinary.service';
import { ProductImage } from '../products/entities/product-image.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ProductImage])],
  controllers: [FilesController],
  providers: [FilesService, CloudinaryService],
  exports: [CloudinaryService],
})
export class FilesModule {}
