import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { LoginUserDto, CreateUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminUpdateProfileDto } from './dto/admin-update-profile.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}


  async create( createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;
      
      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync( password, 10 )
      });

      await this.userRepository.save( user )
      delete user.password;

      return {
        user: user,
        token: this.getJwtToken({ id: user.id })
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async login( loginUserDto: LoginUserDto ) {
    const { password, email } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true, fullName: true, isActive: true, roles: true, phone: true, address: true, createdAt: true }
    });

    if ( !user ) 
      throw new UnauthorizedException('Credentials are not valid (email)');
      
    if ( !bcrypt.compareSync( password, user.password ) )
      throw new UnauthorizedException('Credentials are not valid (password)');

    // Si el usuario estaba inactivo, lo reactivamos automáticamente
    if ( !user.isActive ) {
      await this.userRepository.update(user.id, { isActive: true });
      user.isActive = true;
    }
    
    delete user.password;

    return {
      user: user,
      token: this.getJwtToken({ id: user.id })
    };
  }

  async checkAuthStatus( user: User ){
    // Fetch fresh user data including new fields
    const freshUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true, isActive: true, roles: true, phone: true, address: true, createdAt: true }
    });

    return {
      user: freshUser,
      token: this.getJwtToken({ id: user.id })
    };
  }

  async updateProfile( user: User, updateProfileDto: UpdateProfileDto ) {
    await this.userRepository.update(user.id, updateProfileDto);

    const updatedUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true, isActive: true, roles: true, phone: true, address: true, createdAt: true }
    });

    return {
      user: updatedUser,
      token: this.getJwtToken({ id: user.id })
    };
  }

  async changePassword( user: User, changePasswordDto: ChangePasswordDto ) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Fetch user with password to verify current password
    const userWithPassword = await this.userRepository.findOne({
      where: { id: user.id },
      select: { id: true, password: true }
    });

    if ( !bcrypt.compareSync( currentPassword, userWithPassword.password ) )
      throw new UnauthorizedException('Current password is incorrect');

    await this.userRepository.update(user.id, {
      password: bcrypt.hashSync( newPassword, 10 )
    });

    return { message: 'Password updated successfully' };
  }

  async getAllUsers(paginationDto: PaginationDto) {
    const {
      limit = 12,
      offset = 0,
      q: query,
    } = paginationDto

    const users = await this.userRepository.find({
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        roles: true,
        phone: true,
        address: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      where: query ? [
        { fullName: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ] : undefined,
    });

    const totalUsers = await this.userRepository.count({
      where: query ? [
        { fullName: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ] : undefined,
    });

    return {
      count: totalUsers,
      pages: Math.ceil(totalUsers / limit),
      users,
    }
  }

  async updateUserById(id: string, dto: AdminUpdateProfileDto) {
    const updateData: Partial<User> = { ...dto } as any;

    if (updateData.email) {
        updateData.email = updateData.email.toLowerCase().trim();
    }

    if ((dto as any).password) {
        updateData.password = bcrypt.hashSync((dto as any).password, 10);
    }

    await this.userRepository.update(id, updateData);

    return this.userRepository.findOne({
        where: { id },
        select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
            roles: true,
            phone: true,
            address: true,
            createdAt: true,
        }
    });
  }

  private getJwtToken( payload: JwtPayload ) {
    return this.jwtService.sign( payload );
  }

  private handleDBErrors( error: any ): never {
    if ( error.code === '23505' ) 
      throw new BadRequestException( error.detail );

    console.log(error)
    throw new InternalServerErrorException('Please check server logs');
  }

}