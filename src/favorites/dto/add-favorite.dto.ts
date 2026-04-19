import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddFavoriteDto {
  @ApiProperty({
    description: 'ID of the product to add to favorites',
    example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
  })
  @IsUUID()
  productId: string;
}