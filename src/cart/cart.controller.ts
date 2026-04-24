import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { Auth, GetUser } from '../auth/decorators';
import { User } from '../auth/entities/user.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get the cart of the logged-in user' })
  @ApiResponse({ status: 200, description: 'Cart contents with total price' })
  getCart(@GetUser() user: User) {
    return this.cartService.getCart(user);
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Add a product to cart (increments quantity if already present)' })
  @ApiResponse({ status: 201, description: 'Product added or quantity incremented' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToCart(
    @Body() addToCartDto: AddToCartDto,
    @GetUser() user: User,
  ) {
    return this.cartService.addToCart(addToCartDto.productId, addToCartDto, user);
  }

  @Patch('item/:itemId')
  @Auth()
  @ApiOperation({ summary: 'Update the quantity of a cart item' })
  @ApiResponse({ status: 200, description: 'Cart item quantity updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateCartItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @GetUser() user: User,
  ) {
    return this.cartService.updateCartItem(itemId, updateCartItemDto, user);
  }

  @Delete('item/:itemId')
  @Auth()
  @ApiOperation({ summary: 'Remove a specific item from the cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeFromCart(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @GetUser() user: User,
  ) {
    return this.cartService.removeFromCart(itemId, user);
  }

  @Delete()
  @Auth()
  @ApiOperation({ summary: 'Clear all items from the cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  clearCart(@GetUser() user: User) {
    return this.cartService.clearCart(user);
  }

  @Get('user/:userId')
  @Auth()
  @ApiOperation({ summary: 'Get cart by user ID' })
  @ApiResponse({ status: 200, description: 'Cart contents for the given user' })
  getCartByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.cartService.getCartByUserId(userId);
  }
}