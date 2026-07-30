import { ProductResponseDto } from '@/modules/products/dto';

export class OrderItemResponseDto {
  id: string;
  quantity: number;
  /** Fixed 2-decimal money string */
  unitPrice: string;
  orderId: string;
  productId: string;
  product?: ProductResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
