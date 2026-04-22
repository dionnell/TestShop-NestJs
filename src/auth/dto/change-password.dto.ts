import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {

    @ApiProperty({ description: 'Current password' })
    @IsString()
    @MinLength(6)
    currentPassword: string;

    @ApiProperty({ description: 'New password' })
    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'New password must have uppercase, lowercase and a number'
    })
    newPassword: string;

}