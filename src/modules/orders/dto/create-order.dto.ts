import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  Min,
} from 'class-validator';

import { OrderType, PaymentMethod } from '@generated/prisma/enums';

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  loyaltyPointsAmount?: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

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
