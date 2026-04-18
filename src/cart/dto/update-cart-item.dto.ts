import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'New quantity for the cart item',
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity: number;
}