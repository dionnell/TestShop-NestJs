import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class ProductImageDto {
  @IsUrl({}, { message: 'url must be a valid URL' })
  url: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
