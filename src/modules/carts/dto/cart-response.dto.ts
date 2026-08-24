import { CartItemResponseDto } from './cart-item-response.dto';
import { CartSummaryDto } from './cart-summary.dto';
import { CartItemIssueDto } from './cart-item-issue.dto';

export class CartResponseDto {
  id: string;
  userId: string;
  cartItems?:
    | CartItemResponseDto[]
    | null; /** Present when items are assessed (GET with includeItems / validate / list). */
  valid?: boolean;
  issues?: CartItemIssueDto[];
  summary?: CartSummaryDto;
  createdAt: Date;
  updatedAt: Date;
}
