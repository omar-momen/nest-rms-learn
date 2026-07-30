import { OrderStatus } from '@generated/prisma/client';

import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  id: string;
  status: OrderStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  couponCode?: string;
  loyaltyPointsAmount?: string;
  address?: string;
  paymentMethod?: string;

  total: string;
  discount: string;
  tax: string;
  subtotal: string;

  orderItems: OrderItemResponseDto[];
}
