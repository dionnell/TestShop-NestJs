import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductImageDto {
  @IsString()
  url: string;

  // publicId can arrive as null (seed images) or undefined — treat both as optional
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ?? undefined)
  publicId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
