import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  Min,
} from 'class-validator';

import { OrderType, PaymentMethod } from '@generated/prisma/enums';

export class ValidateCartDto {
  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  loyaltyPointsAmount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @IsUUID()
  @IsOptional()
  addressId?: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;
}
