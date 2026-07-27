import { Prisma } from '@generated/prisma/client';

export class ProductResponseDto {
  id: string;
  name: string;
  description?: string | null;
  price: Prisma.Decimal;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
}
