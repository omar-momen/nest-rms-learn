import { CartItemResponseDto } from '@/modules/cart-items/dto';
import { CartSummaryDto } from './cart-summary.dto';
import { CartItemIssueDto } from './cart-item-issue.dto';
import { UserResponseDto } from '@/modules/users/dto';

export class CartResponseDto {
  id: string;
  userId: string;
  user?: UserResponseDto;
  cartItems?: CartItemResponseDto[] | null;
  /** Present when items are assessed (GET with includeItems / validate). */
  valid?: boolean;
  issues?: CartItemIssueDto[];
  summary?: CartSummaryDto;
  createdAt: Date;
  updatedAt: Date;
}
