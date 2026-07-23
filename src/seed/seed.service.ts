import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';

import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';
import { User } from '../auth/entities/user.entity';
import { CloudinaryService } from '../files/cloudinary.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeedService');

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async runSeed() {
    // 1. Wipe Cloudinary folder testShop/ (all product subfolders)
    await this.wipeCloudinaryFolder();

    // 2. Wipe DB tables
    await this.deleteTables();

    // 3. Re-create users
    const adminUser = await this.insertUsers();

    // 4. Upload seed images to Cloudinary and create products
    await this.insertNewProducts(adminUser);

    return 'SEED EXECUTED';
  }

  // ─── Cloudinary: delete the whole testShop/ tree ──────────────────────────
  private async wipeCloudinaryFolder() {
    this.logger.log('Wiping Cloudinary folder: testShop/');
    await this.cloudinaryService.deleteFolder('testShop');
    this.logger.log('Cloudinary folder wiped');
  }

  // ─── DB: delete all products and users ────────────────────────────────────
  private async deleteTables() {
    await this.productsService.deleteAllProducts();

    await this.userRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  private async insertUsers() {
    const seedUsers = initialData.users;
    const dbUsers = await this.userRepository.save(seedUsers);
    return dbUsers[0];
  }

  // ─── Products + images ────────────────────────────────────────────────────
  private async insertNewProducts(user: User) {
    await this.productsService.deleteAllProducts();

    const products = initialData.products;

    // Upload images and create products sequentially to avoid rate-limit issues
    for (const product of products) {
      const uploadedImages = await this.uploadProductImages(
        product.images,
        product.slug,
      );

      await this.productsService.create(
        { ...product, images: uploadedImages as any },
        user,
      );

      this.logger.log(`Created product: ${product.title}`);
    }

    return true;
  }

  /**
   * Upload each local image to testShop/<slug>/ on Cloudinary.
   * Returns an array of { url, publicId, order } objects ready for the DB.
   */
  private async uploadProductImages(
    imageFileNames: string[],
    productSlug: string,
  ) {
    const staticDir = path.join(process.cwd(), 'static', 'products');

    const results = await Promise.all(
      imageFileNames.map(async (fileName, index) => {
        const filePath = path.join(staticDir, fileName);

        try {
          const result = await this.cloudinaryService.uploadFromPath(
            filePath,
            productSlug,
          );
          this.logger.log(`  ✓ Uploaded ${fileName} → ${result.secure_url}`);
          return {
            url:      result.secure_url,
            publicId: result.public_id,
            order:    index,
          };
        } catch (error) {
          this.logger.error(`  ✗ Failed to upload ${fileName}: ${error.message}`);
          // Return a placeholder so the product still gets created
          return {
            url:      '',
            publicId: '',
            order:    index,
          };
        }
      }),
    );

    return results.filter(r => r.url !== '');
  }
}
