import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { User } from '@generated/prisma/client';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.create({ data });
    return this.toResponseDto(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.toResponseDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(user);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    await this.findOne(id);
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toResponseDto(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const [cartCount, orderCount] = await Promise.all([
      this.prisma.cart.count({ where: { userId: id } }),
      this.prisma.order.count({ where: { userId: id } }),
    ]);

    if (cartCount > 0 || orderCount > 0) {
      throw new BadRequestException(
        'Cannot delete user with an existing cart or orders',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
