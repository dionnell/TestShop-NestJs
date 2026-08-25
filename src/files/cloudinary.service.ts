import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger('CloudinaryService');

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  uploadFile(
    file: Express.Multer.File,
    productSlug = 'general',
  ): Promise<UploadApiResponse> {
    const folder = `testShop/${productSlug}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${JSON.stringify(error)}`);
            return reject(
              new BadRequestException(
                `Cloudinary error [${error.http_code}]: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(new InternalServerErrorException('Cloudinary returned no result'));
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  uploadFromPath(
    filePath: string,
    productSlug: string,
  ): Promise<UploadApiResponse> {
    const folder = `testShop/${productSlug}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${JSON.stringify(error)}`);
            return reject(
              new BadRequestException(
                `Cloudinary error [${error.http_code}]: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(new InternalServerErrorException('Cloudinary returned no result'));
          }
          resolve(result);
        },
      );
      fs.createReadStream(filePath).pipe(stream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new BadRequestException(`Could not delete image: ${publicId}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      await cloudinary.api.delete_resources_by_prefix(folderPath + '/');
      await cloudinary.api.delete_folder(folderPath);
      this.logger.log(`Deleted Cloudinary folder: ${folderPath}`);
    } catch (error: any) {
      if (error?.error?.http_code === 404) {
        this.logger.log(`Folder ${folderPath} not found — skipping delete`);
        return;
      }
      throw error;
    }
  }
}