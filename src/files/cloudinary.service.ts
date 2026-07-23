import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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

  /**
   * Upload from a Multer file buffer (used by the admin upload endpoint).
   * Saves into testShop/<productSlug>/<filename>
   */
  uploadFile(
    file: Express.Multer.File,
    productSlug = 'general',
  ): Promise<UploadApiResponse> {
    const folder = `testShop/${productSlug}`;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload from a local file path (used by the seed).
   * Saves into testShop/<productSlug>/<filename>
   */
  uploadFromPath(
    filePath: string,
    productSlug: string,
  ): Promise<UploadApiResponse> {
    const folder = `testShop/${productSlug}`;
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result);
        },
      );
      fs.createReadStream(filePath).pipe(stream);
    });
  }

  /**
   * Delete a single asset by its Cloudinary public_id.
   */
  async deleteFile(publicId: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new BadRequestException(`Could not delete image: ${publicId}`);
    }
  }

  /**
   * Delete an entire Cloudinary folder and ALL assets inside it.
   * Used by the seed to wipe testShop/ before reloading.
   */
  async deleteFolder(folderPath: string): Promise<void> {
    try {
      // Delete all resources inside the folder first
      await cloudinary.api.delete_resources_by_prefix(folderPath + '/');
      // Then delete the now-empty folder
      await cloudinary.api.delete_folder(folderPath);
      this.logger.log(`Deleted Cloudinary folder: ${folderPath}`);
    } catch (error: any) {
      // If folder doesn't exist yet, that's fine
      if (error?.error?.http_code === 404) {
        this.logger.log(`Folder ${folderPath} not found — skipping delete`);
        return;
      }
      throw error;
    }
  }
}
