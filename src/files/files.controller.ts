import {
  Controller,
  Post,
  Delete,
  Patch,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CloudinaryService } from './cloudinary.service';
import { FilesService } from './files.service';
import { fileFilter } from './helpers';
import { Auth } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';

@ApiTags('Files - Upload & Manage')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── Upload ────────────────────────────────────────────────────────────────
  @Post('product')
  @Auth(ValidRoles.admin)
  @ApiOperation({ summary: 'Upload a product image to Cloudinary (testShop/<slug>/)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'slug', required: false, description: 'Product slug — used as Cloudinary subfolder (default: general)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter,
      storage: memoryStorage(),
    }),
  )
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('slug') slug = 'general',
  ) {
    if (!file) throw new BadRequestException('Make sure that the file is an image');

    const result = await this.cloudinaryService.uploadFile(file, slug);

    return {
      secureUrl: result.secure_url,
      publicId:  result.public_id,
    };
  }

  // ─── Delete single image ───────────────────────────────────────────────────
  @Delete('product/image/:imageId')
  @Auth(ValidRoles.admin)
  @ApiOperation({ summary: 'Delete a product image by its DB id (also removes from Cloudinary)' })
  deleteProductImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.filesService.deleteImage(imageId);
  }

  // ─── Reorder images ────────────────────────────────────────────────────────
  @Patch('product/:productId/reorder')
  @Auth(ValidRoles.admin)
  @ApiOperation({ summary: 'Set the display order of images for a product' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderedIds: { type: 'array', items: { type: 'number' }, example: [3, 1, 2] },
      },
    },
  })
  reorderImages(
    @Param('productId') productId: string,
    @Body('orderedIds') orderedIds: number[],
  ) {
    return this.filesService.reorderImages(productId, orderedIds);
  }
}
