import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { PrismaService } from '@/modules/prisma/prisma.service';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';

import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable({ scope: Scope.REQUEST })
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  create(data: CreateAddressDto): Promise<AddressResponseDto> {
    return this.prisma.address.create({
      data: {
        ...data,
        userId: this.userId,
      },
    });
  }

  findAll(): Promise<AddressResponseDto[]> {
    return this.prisma.address.findMany({
      where: { userId: this.userId },
    });
  }

  async findOne(id: string): Promise<AddressResponseDto> {
    const address = await this.prisma.address.findFirst({
      where: { id, userId: this.userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async update(
    id: string,
    data: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    await this.findOne(id);
    return this.prisma.address.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Address deleted successfully' };
  }
}
