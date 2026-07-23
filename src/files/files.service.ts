import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CloudinaryService } from './cloudinary.service';
import { ProductImage } from '../products/entities/product-image.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /** Delete one image: removes from Cloudinary then from DB */
  async deleteImage(imageId: number): Promise<{ message: string }> {
    const image = await this.productImageRepository.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException(`Image with id ${imageId} not found`);

    if (image.publicId) {
      await this.cloudinaryService.deleteFile(image.publicId);
    }

    await this.productImageRepository.remove(image);
    return { message: 'Image deleted successfully' };
  }

  /** Re-order images: receives an array of image IDs in the desired order */
  async reorderImages(productId: string, orderedIds: number[]): Promise<{ message: string }> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }

    const updates = orderedIds.map((id, index) =>
      this.productImageRepository.update(
        { id, product: { id: productId } },
        { order: index },
      ),
    );

    await Promise.all(updates);
    return { message: 'Images reordered successfully' };
  }
}
