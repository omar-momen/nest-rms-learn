import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { User } from '@generated/prisma/client';
import { normalizeEmail } from '@/utils/email.util';
import { hashPassword } from '@/utils/password.util';
import { UpdateUserDto, UserResponseDto } from './dto';
import { REQUEST } from '@nestjs/core';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';
import { AuthService } from '@/modules/auth/auth.service';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  async findMe(): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: this.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(user);
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

    const { password, email: rawEmail, ...rest } = data;
    const email = rawEmail !== undefined ? normalizeEmail(rawEmail) : undefined;

    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(email !== undefined ? { email } : {}),
        ...(password !== undefined
          ? { password: await hashPassword(password) }
          : {}),
      },
    });

    if (password !== undefined) {
      // Keep the caller's refresh family; revoke every other active family.
      await this.authService.revokeOtherSessionFamilies(
        id,
        this.request.user.familyId,
      );
    }

    return this.toResponseDto(user);
  }

  async updateMe(data: UpdateUserDto): Promise<UserResponseDto> {
    return this.update(this.userId, data);
  }

  async remove(id: string): Promise<{ message: string }> {
    return this.deleteUser(id);
  }

  async removeMe(): Promise<{ message: string }> {
    return this.deleteUser(this.userId);
  }

  // ================ Private Methods =================

  private async deleteUser(id: string): Promise<{ message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE id = ${id} FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new NotFoundException('User not found');
      }

      const cartCount = await tx.cart.count({ where: { userId: id } });
      const orderCount = await tx.order.count({ where: { userId: id } });

      if (cartCount > 0 || orderCount > 0) {
        throw new BadRequestException(
          'Cannot delete user with an existing cart or orders',
        );
      }

      await tx.user.delete({ where: { id } });
      return { message: 'User deleted successfully' };
    });
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
