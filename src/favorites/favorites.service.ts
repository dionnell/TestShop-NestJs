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
    const { limit = 12, offset = 0, q: query } = paginationDto;

    // Raw query para contar favoritos por producto
    const qb = this.favoriteRepository
      .createQueryBuilder('favorite')
      .select('favorite.productId', 'productId')
      .addSelect('COUNT(favorite.id)', 'favoriteCount')
      .groupBy('favorite.productId');

    if (query) {
      qb.innerJoin('favorite.product', 'product')
        .andWhere('product.title ILike :query', { query: `%${query}%` });
    }

    const countsByProduct: { productId: string; favoriteCount: string }[] =
      await qb.getRawMany();

    const countMap = new Map(
      countsByProduct.map((r) => [r.productId, Number(r.favoriteCount)])
    );

    // Traer todos los productos con paginación
    const productRepo = this.favoriteRepository.manager.getRepository('Product');

    let productQb = productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .take(limit)
      .skip(offset);

    if (query) {
      productQb = productQb.where('product.title ILike :query', { query: `%${query}%` });
    }

    const [products, total] = await productQb.getManyAndCount();

    return {
      count: products.length,
      pages: Math.ceil(total / limit),
      favorites: (products as any[]).map((product) => ({
        id: product.id,
        favoriteCount: countMap.get(product.id) ?? 0,
        product: {
          ...product,
          images: product.images?.map((img: any) => img.url) ?? [],
        },
      })),
    };
  }
}