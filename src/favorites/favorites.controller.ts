import { Controller, Get, Post, Delete, Param, ParseUUIDPipe, Body, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { Auth, GetUser } from '../auth/decorators';
import { User } from '../auth/entities/user.entity';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ValidRoles } from 'src/auth/interfaces/valid-roles';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get all favorites for the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of favorite products' })
  getFavorites(@GetUser() user: User) {
    return this.favoritesService.getFavorites(user);
  }
 
  @Post()
  @Auth()
  @ApiOperation({ summary: 'Add a product to favorites' })
  @ApiResponse({ status: 201, description: 'Product added to favorites' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product already in favorites' })
  addFavorite(
    @Body() addFavoriteDto: AddFavoriteDto,
    @GetUser() user: User,
  ) {
    return this.favoritesService.addFavorite(addFavoriteDto.productId, user);
  }

  @Delete(':productId')
  @Auth()
  @ApiOperation({ summary: 'Remove a product from favorites' })
  @ApiResponse({ status: 200, description: 'Product removed from favorites' })
  @ApiResponse({ status: 404, description: 'Product not found in favorites' })
  removeFavorite(
    @Param('productId', ParseUUIDPipe) productId: string,
    @GetUser() user: User,
  ) {
    return this.favoritesService.removeFavorite(productId, user);
  }

  @Get('admin/group')
  @Auth(ValidRoles.admin)
  getGroupFavorite(
    @Query() paginationDto: PaginationDto
  ) {
    return this.favoritesService.getGroupFavorite(paginationDto);
  }
}