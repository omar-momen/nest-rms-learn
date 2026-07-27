import { ProductResponseDto } from '@/modules/products/dto';
import { CartResponseDto } from '@/modules/carts/dto';

export class CartItemResponseDto {
  id: string;
  quantity: number;

  cartId: string;
  cart?: CartResponseDto;

  productId: string;
  product?: ProductResponseDto;

  createdAt: Date;
  updatedAt: Date;
}
