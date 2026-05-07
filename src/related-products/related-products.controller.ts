import { Controller, Get, Param, ParseUUIDPipe, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RelatedProductsService } from './related-products.service';

@ApiTags('Related Products')
@Controller('products')
export class RelatedProductsController {
  constructor(private readonly relatedProductsService: RelatedProductsService) {}

  @Get(':id/related')
  @ApiOperation({ summary: 'Get AI-powered related products for a given product' })
  @ApiResponse({ status: 200, description: 'List of related products ordered by relevance' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of related products (default: 6)' })
  getRelatedProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.relatedProductsService.getRelatedProducts(id, limit);
  }
}