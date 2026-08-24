import { toDecimal } from '@/utils/money.util';
import { Prisma } from '@generated/prisma/client';

import { CartItemIssueCode, CartItemIssueDto } from './line-item-issue';

type LineItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    isAvailable: boolean;
    price: Prisma.Decimal | string | number;
  } | null;
};

/** Soft line-item health check — does not throw. Used by cart validate and order checkout. */
export function assessCartItems(
  cartItems: LineItemWithProduct[],
  stockByProductId?: Map<string, number>,
): {
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

    if (stockByProductId) {
      const available = stockByProductId.get(item.productId) ?? 0;
      if (item.quantity > available) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          code: CartItemIssueCode.INSUFFICIENT_STOCK,
          message: `Requested ${item.quantity}, only ${available} available`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
