import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../auth/entities/user.entity';
import { ProductsService } from '../products/products.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,

    private readonly productsService: ProductsService,
  ) {}

  async addFavorite(productId: string, user: User) {
    // Verify product exists
    await this.productsService.findOne(productId);

    const existing = await this.favoriteRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
    });

    if (existing) {
      throw new ConflictException('Product is already in favorites');
    }

    const favorite = this.favoriteRepository.create({
      user,
      product: { id: productId } as any,
    });

    await this.favoriteRepository.save(favorite);

    return { message: 'Product added to favorites', productId };
  }

  async removeFavorite(productId: string, user: User) {
    const favorite = await this.favoriteRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
    });

    if (!favorite) {
      throw new NotFoundException('Product not found in favorites');
    }

    await this.favoriteRepository.remove(favorite);

    return { message: 'Product removed from favorites', productId };
  }

  async getFavorites(user: User) {
    const favorites = await this.favoriteRepository.find({
      where: { user: { id: user.id } },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });

    return {
      count: favorites.length,
      favorites: favorites.map((f) => ({
        id: f.id,
        createdAt: f.createdAt,
        product: {
          ...f.product,
          images: f.product.images?.map((img) => img.url) ?? [],
        },
      })),
    };
  }

  async getGroupFavorite(paginationDto: PaginationDto) {
    const {
      limit = 12,
      offset = 0,      
      q: query,
    } = paginationDto;

    let queryBuilder = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.product', 'product')
      .groupBy('product.id')
      .addGroupBy('favorite.id')
      .addGroupBy('favorite.createdAt')
      .addSelect('COUNT(favorite.id) OVER (PARTITION BY product.id)', 'favoriteCount')
      .orderBy('COUNT(favorite.id)', 'DESC')
      .take(limit)
      .skip(offset);

    if (query) {
      queryBuilder = queryBuilder.andWhere('product.title ILike :query', {
        query: `%${query}%`,
      });
    }

    const favorites = await queryBuilder.getMany();

    if (favorites.length === 0) {
      throw new NotFoundException('Product not found in favorites');
    }
    const totalProducts = await this.favoriteRepository.count({
      where: {
        product: {
          title: query ? ILike(`%${query}%`) : undefined,
        },
      },
    });

    return {
      count: favorites.length,
      pages: Math.ceil(totalProducts / limit),
      favorites: favorites.map((favorite: any) => ({
        id: favorite.id,
        createdAt: favorite.createdAt,
        favoriteCount: favorite.favoriteCount || 0,
        product: {
          ...favorite.product,
          images: favorite.product.images?.map((img: any) => img.url) ?? [],
        },
      })),
    };
  }
}