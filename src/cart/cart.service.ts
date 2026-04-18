import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { User } from '../auth/entities/user.entity';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    private readonly productsService: ProductsService,
  ) {}

  async getCart(user: User) {
    const items = await this.cartItemRepository.find({
      where: { user: { id: user.id } },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });

    const formattedItems = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      createdAt: item.createdAt,
      product: {
        ...item.product,
        images: item.product.images?.map((img) => img.url) ?? [],
      },
      subtotal: item.product.price * item.quantity,
    }));

    const total = formattedItems.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      count: items.length,
      total: +total.toFixed(2),
      items: formattedItems,
    };
  }

  async addToCart(productId: string, dto: AddToCartDto, user: User) {
    // Verify product exists
    await this.productsService.findOne(productId);

    const { quantity = 1 } = dto;

    // If item already in cart, increment quantity
    const existing = await this.cartItemRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
    });

    if (existing) {
      existing.quantity += quantity;
      await this.cartItemRepository.save(existing);
      return { message: 'Cart item quantity updated', productId, quantity: existing.quantity };
    }

    const cartItem = this.cartItemRepository.create({
      user,
      product: { id: productId } as any,
      quantity,
    });

    await this.cartItemRepository.save(cartItem);

    return { message: 'Product added to cart', productId, quantity };
  }

  async updateCartItem(itemId: string, dto: UpdateCartItemDto, user: User) {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, user: { id: user.id } },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = dto.quantity;
    await this.cartItemRepository.save(item);

    return { message: 'Cart item updated', itemId, quantity: dto.quantity };
  }

  async removeFromCart(itemId: string, user: User) {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, user: { id: user.id } },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(item);

    return { message: 'Product removed from cart', itemId };
  }

  async clearCart(user: User) {
    await this.cartItemRepository.delete({ user: { id: user.id } });
    return { message: 'Cart cleared' };
  }
}