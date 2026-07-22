import { Prisma } from '@generated/prisma/client';

export class ProductResponseDto {
  id: string;
  name: string;
  description?: string | null;
  price: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
}
