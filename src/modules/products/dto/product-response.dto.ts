import { CategoryResponseDto } from '@/modules/categories/dto';

export class ProductResponseDto {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  isAvailable: boolean;

  createdAt: Date;
  updatedAt: Date;

  categoryId: string;
  category?: CategoryResponseDto;
  /** Present when listing/getting with `branchId`. Missing row means 0. */
  availableStock?: number;
}
