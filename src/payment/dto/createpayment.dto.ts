import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Total amount to pay in CLP',
    example: 59990,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;
}