import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { User } from '@generated/prisma/client';
import { AuthService } from '@/modules/auth/auth.service';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';
import { normalizeEmail } from '@/utils/email.util';
import { hashPassword, verifyPassword } from '@/utils/password.util';

import {
  ChangePasswordDto,
  UpdateUserAdminDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto';

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
    return this.findOne(this.userId);
  }

  async updateMe(data: UpdateUserDto): Promise<UserResponseDto> {
    return this.update(this.userId, data, this.request.user.familyId);
  }

  async changePassword(data: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: this.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await verifyPassword(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (data.currentPassword === data.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(data.newPassword) },
    });

    await this.authService.revokeOtherSessionFamilies(
      user.id,
      this.request.user.familyId,
    );

    return { message: 'Password changed successfully' };
  }

  async removeMe(): Promise<{ message: string }> {
    return this.deleteUser(this.userId);
  }

  findAll(): Promise<UserResponseDto[]> {
    return this.prisma.user
      .findMany({ orderBy: { createdAt: 'desc' } })
      .then((users) => users.map((user) => this.toResponseDto(user)));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(user);
  }

  async updateForDashboard(
    id: string,
    data: UpdateUserAdminDto,
  ): Promise<UserResponseDto> {
    const exceptFamilyId =
      id === this.userId ? this.request.user.familyId : undefined;

    return this.update(id, data, exceptFamilyId);
  }

  async remove(id: string): Promise<{ message: string }> {
    return this.deleteUser(id);
  }

  private async update(
    id: string,
    data: UpdateUserDto | UpdateUserAdminDto,
    exceptFamilyId?: string,
  ): Promise<UserResponseDto> {
    await this.findOne(id);

    const email =
      data.email !== undefined ? normalizeEmail(data.email) : undefined;
    const password = 'password' in data ? data.password : undefined;
    const role = 'role' in data ? data.role : undefined;

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
        ...(email !== undefined ? { email } : {}),
        ...(password !== undefined
          ? { password: await hashPassword(password) }
          : {}),
        ...(role !== undefined ? { role } : {}),
      },
    });

    if (password !== undefined) {
      await this.authService.revokeOtherSessionFamilies(id, exceptFamilyId);
    }

    return this.toResponseDto(user);
  }

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
      role: user.role,
      loyaltyPointsBalance: user.loyaltyPointsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
