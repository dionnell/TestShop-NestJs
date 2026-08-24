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
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';
import { User } from '../auth/entities/user.entity';

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
        images: images.map((img, index) =>
          this.productImageRepository.create({
            url:      img.url,
            publicId: img.publicId,
            order:    img.order ?? index,
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

    const whereClause = {
      gender: gender ? gender : undefined,
      price:  priceWhere,
      sizes:  sizesArray ? ArrayContains(sizesArray) : undefined,
      title:  query ? ILike(`%${query}%`) : undefined,
    };

    // Step 1: paginate IDs only — no JOIN so LIMIT/OFFSET works correctly
    const [pagedProducts, totalProducts] = await this.productRepository.findAndCount({
      select: { id: true },
      take:   limit,
      skip:   offset,
      order:  { id: 'ASC' },
      where:  whereClause,
    });

    if (pagedProducts.length === 0) {
      return { count: totalProducts, pages: Math.ceil(totalProducts / limit), products: [] };
    }

    // Step 2: load full product data (with images) for those IDs
    const productIds = pagedProducts.map((p) => p.id);
    const products = await this.productRepository.find({
      where:     { id: In(productIds) },
      relations: { images: true },
      order:     { id: 'ASC' },
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
        order: { images: { order: 'ASC' } },
      });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
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

    if (!product)
      throw new NotFoundException(`Product with id: ${id} not found`);

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map((img, index) =>
          this.productImageRepository.create({
            url:      img.url,
            publicId: img.publicId,
            order:    img.order ?? index,
          }),
        );
      }

      // await this.productRepository.save( product );
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
    // console.log(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
