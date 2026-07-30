import { toDecimal } from '@/utils/money.util';
import { Prisma } from '@generated/prisma/client';

import { CartItemIssueCode, CartItemIssueDto } from '../dto';

type CartItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    isAvailable: boolean;
    price: Prisma.Decimal | string | number;
  } | null;
};

/** Soft item health check — does not throw. */
export function assessCartItems(cartItems: CartItemWithProduct[]): {
  valid: boolean;
  issues: CartItemIssueDto[];
} {
  const issues: CartItemIssueDto[] = [];

  if (cartItems.length === 0) {
    issues.push({
      cartItemId: '',
      productId: '',
      code: CartItemIssueCode.EMPTY_CART,
      message: 'Cart is empty',
    });
    return { valid: false, issues };
  }

  for (const item of cartItems) {
    if (!item.product?.isAvailable) {
      issues.push({
        cartItemId: item.id,
        productId: item.productId,
        code: CartItemIssueCode.UNAVAILABLE,
        message: 'Product is unavailable',
      });
      continue;
    }

    if (item.quantity < 1) {
      issues.push({
        cartItemId: item.id,
        productId: item.productId,
        code: CartItemIssueCode.INVALID_QUANTITY,
        message: 'Quantity must be at least 1',
      });
    }

    // Free / promotional (0) allowed; negative is invalid
    if (toDecimal(item.product.price).lessThan(0)) {
      issues.push({
        cartItemId: item.id,
        productId: item.productId,
        code: CartItemIssueCode.INVALID_PRICE,
        message: 'Product price is invalid',
      });
    }
  }

  return { valid: issues.length === 0, issues };
}
