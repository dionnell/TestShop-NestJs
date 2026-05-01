import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

    @ApiProperty({ description: 'Roles', example: 'user, admin' })
    @IsString()
    @IsOptional()
    roles?: string[];

    @ApiProperty({ description: 'Active', example: 'true or false' })
    @IsString()
    @IsOptional()
    isActive?: boolean;
}