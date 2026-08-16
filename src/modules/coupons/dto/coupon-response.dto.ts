import { CouponType } from '@generated/prisma/enums';

export class CouponResponseDto {
  id: string;
  code: string;
  value: string;
  type: CouponType;
  isActive: boolean;
  startDate: Date;
  expireDate: Date;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
