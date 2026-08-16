import { Injectable, NotFoundException } from '@nestjs/common';

import { Coupon } from '@generated/prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { serializeMoney, toDecimal } from '@/utils/money.util';

import { CreateCouponDto, CouponResponseDto, UpdateCouponDto } from './dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCouponDto): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code,
        value: toDecimal(data.value),
        type: data.type,
        isActive: data.isActive ?? true,
        startDate: new Date(data.startDate),
        expireDate: new Date(data.expireDate),
        minOrderAmount: toDecimal(data.minOrderAmount),
        maxDiscountAmount: toDecimal(data.maxDiscountAmount),
        usageLimit: data.usageLimit,
      },
    });

    return this.toResponseDto(coupon);
  }

  async findAll(): Promise<CouponResponseDto[]> {
    const coupons = await this.prisma.coupon.findMany();
    return coupons.map((coupon) => this.toResponseDto(coupon));
  }

  async findOne(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return this.toResponseDto(coupon);
  }

  async update(id: string, data: UpdateCouponDto): Promise<CouponResponseDto> {
    await this.findOne(id);

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.value !== undefined && { value: toDecimal(data.value) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.startDate !== undefined && {
          startDate: new Date(data.startDate),
        }),
        ...(data.expireDate !== undefined && {
          expireDate: new Date(data.expireDate),
        }),
        ...(data.minOrderAmount !== undefined && {
          minOrderAmount: toDecimal(data.minOrderAmount),
        }),
        ...(data.maxDiscountAmount !== undefined && {
          maxDiscountAmount: toDecimal(data.maxDiscountAmount),
        }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
      },
    });

    return this.toResponseDto(coupon);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted successfully' };
  }

  private toResponseDto(coupon: Coupon): CouponResponseDto {
    return {
      ...coupon,
      value: serializeMoney(coupon.value),
      minOrderAmount: serializeMoney(coupon.minOrderAmount),
      maxDiscountAmount: serializeMoney(coupon.maxDiscountAmount),
    };
  }
}
