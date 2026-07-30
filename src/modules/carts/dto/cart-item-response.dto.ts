import { ProductResponseDto } from '@/modules/products/dto';

export class CartItemResponseDto {
  id: string;
  quantity: number;
  cartId: string;
  productId: string;
  product?: ProductResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
