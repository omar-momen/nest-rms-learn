import { OrderStatus } from '@generated/prisma/client';

import { OrderItemResponseDto } from '@/modules/order-items/dto';

export class OrderResponseDto {
  id: string;
  status: OrderStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  couponCode?: string;
  loyaltyPointsAmount?: number;
  address?: string;
  paymentMethod?: string;

  total: number;
  discount: number;
  tax: number;
  subtotal: number;

  orderItems: OrderItemResponseDto[];
}
