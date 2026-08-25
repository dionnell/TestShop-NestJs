import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? undefined : value))
  @IsString()
  publicId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  order?: number;
}
