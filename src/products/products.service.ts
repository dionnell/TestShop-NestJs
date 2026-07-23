import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ArrayContains,
  Between,
  DataSource,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';
import { User } from '../auth/entities/user.entity';

// Shape sent by the frontend when images are already uploaded to Cloudinary
interface ImageInput {
  url: string;
  publicId?: string;
  order?: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: (images as unknown as ImageInput[]).map((img, index) =>
          this.productImageRepository.create({
            url:      typeof img === 'string' ? img : img.url,
            publicId: typeof img === 'string' ? undefined : img.publicId,
            order:    typeof img === 'string' ? index : (img.order ?? index),
          }),
        ),
        user,
      });

      await this.productRepository.save(product);
      return this.findOnePlain(product.id);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const {
      limit = 12,
      offset = 0,
      gender = '',
      minPrice,
      maxPrice,
      sizes,
      q: query,
    } = paginationDto;

    const sizesArray = sizes ? sizes.toUpperCase().split(',') : undefined;

    const priceWhere =
      minPrice !== undefined && maxPrice !== undefined
        ? Between(minPrice, maxPrice)
        : minPrice !== undefined
        ? MoreThanOrEqual(minPrice)
        : maxPrice !== undefined
        ? LessThanOrEqual(maxPrice)
        : undefined;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: { images: true },
      order: { id: 'ASC', images: { order: 'ASC' } },
      where: {
        gender:  gender ? gender : undefined,
        price:   priceWhere,
        sizes:   sizesArray ? ArrayContains(sizesArray) : undefined,
        title:   query ? ILike(`%${query}%`) : undefined,
      },
    });

    const totalProducts = await this.productRepository.count({
      where: {
        gender: gender ? gender : undefined,
        price:  priceWhere,
        sizes:  sizesArray ? ArrayContains(sizesArray) : undefined,
        title:  query ? ILike(`%${query}%`) : undefined,
      },
    });

    return {
      count: totalProducts,
      pages: Math.ceil(totalProducts / limit),
      products: products.map((product) => ({
        ...product,
        images: product.images.map((img) => img.url),
      })),
    };
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOne({
        where: { id: term },
        relations: { images: true },
        order:  { images: { order: 'ASC' } },
      });
    } else {
      product = await this.productRepository
        .createQueryBuilder('prod')
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug:  term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .orderBy('prodImages.order', 'ASC')
        .getOne();
    }

    if (!product) throw new NotFoundException(`Product with ${term} not found`);
    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map((image) => ({
        id:       image.id,
        url:      image.url,
        publicId: image.publicId,
        order:    image.order,
      })),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({ id, ...toUpdate });
    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        // Delete old DB rows (Cloudinary assets are deleted separately via DELETE /files/product/image/:id)
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = (images as unknown as ImageInput[]).map((img, index) =>
          this.productImageRepository.create({
            url:      typeof img === 'string' ? img : img.url,
            publicId: typeof img === 'string' ? undefined : img.publicId,
            order:    typeof img === 'string' ? index : (img.order ?? index),
          }),
        );
      }

      product.user = user;
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  async deleteAllProducts() {
    try {
      return await this.productRepository.createQueryBuilder('product').delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
