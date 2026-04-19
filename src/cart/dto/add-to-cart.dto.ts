import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID of the product to add to cart',
    example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity to add (defaults to 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity?: number = 1;
}