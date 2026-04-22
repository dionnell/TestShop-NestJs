import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {

    @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
    @IsString()
    @MinLength(1)
    @IsOptional()
    fullName?: string;

    @ApiProperty({ description: 'Phone number', example: '+56912345678' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'Address', example: 'Av. Apoquindo 1234, Santiago' })
    @IsString()
    @IsOptional()
    address?: string;

}