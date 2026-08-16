import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class SeedService {

  constructor(
    private readonly productsService: ProductsService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async runSeed() {
    await this.deleteTables();
    const adminUser = await this.insertUsers();
    await this.insertNewProducts(adminUser);
    return 'SEED EXECUTED';
  }

  private async deleteTables() {
    await this.productsService.deleteAllProducts();

    await this.userRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();
  }

  private async insertUsers() {
    const seedUsers = initialData.users;
    const dbUsers = await this.userRepository.save(seedUsers);
    return dbUsers[0];
  }

  private async insertNewProducts(user: User) {
    await this.productsService.deleteAllProducts();

    const insertPromises = initialData.products.map((product) => {
      const { images = [], ...rest } = product as any;

      return this.productsService.create(
        {
          ...rest,
          // seed images are plain strings — convert to ProductImageDto shape
          images: images.map((url: string, index: number) => ({
            url,
            publicId: null,
            order: index,
          })),
        },
        user,
      );
    });

    await Promise.all(insertPromises);
    return true;
  }
}
