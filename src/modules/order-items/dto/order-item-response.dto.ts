import { Prisma } from '@generated/prisma/client';
import { ProductResponseDto } from '@/modules/products/dto';

export class OrderItemResponseDto {
  id: string;
  quantity: number;
  unitPrice: Prisma.Decimal;

  orderId: string;

  productId: string;
  product?: ProductResponseDto;

  createdAt: Date;
  updatedAt: Date;
}
