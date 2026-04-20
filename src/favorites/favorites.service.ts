import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../auth/entities/user.entity';
import { ProductsService } from '../products/products.service';

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

  async getFavoriteByProductId(productId: string, user: User) {
    const favorite = await this.favoriteRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
      relations: { product: true },
    });
  
    if (!favorite)
      throw new NotFoundException('Product not found in favorites');
  
    return {
      id: favorite.id,
      createdAt: favorite.createdAt,
      product: {
        ...favorite.product,
        images: favorite.product.images?.map((img) => img.url) ?? [],
      },
    };
  }
}