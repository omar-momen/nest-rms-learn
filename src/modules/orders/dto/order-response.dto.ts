import { OrderStatus } from '@generated/prisma/client';

import { OrderItemResponseDto } from './order-item-response.dto';
import { OrderType, PaymentMethod } from '@generated/prisma/enums';

import { AddressResponseDto } from '@/modules/addresses/dto/address-response.dto';
import { BranchResponseDto } from '@/modules/branches/dto/branch-response.dto';

export class OrderResponseDto {
  id: string;
  status: OrderStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  couponCode?: string;
  loyaltyPointsAmount?: string;
  paymentMethod: PaymentMethod;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;

  branchName?: string;
  branchLocation?: string;

  total: string;
  discount: string;
  tax: string;
  subtotal: string;

  orderItems: OrderItemResponseDto[];
  type: OrderType;
  address?: AddressResponseDto;
  branch?: BranchResponseDto;
}
