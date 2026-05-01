import { IsString, IsOptional, MinLength, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AdminUpdateProfileDto {

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

    @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
    @IsString()
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'Roles', example: ['user', 'admin'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    roles?: string[];

    @ApiProperty({ description: 'Active status', example: true })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;
}