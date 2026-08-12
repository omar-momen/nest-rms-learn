import { Prisma } from '@generated/prisma/client';

import { CartSummaryDto } from '../dto';

import {
  multiplyMoney,
  serializeMoney,
  sumMoney,
  toDecimal,
} from '@/utils/money.util';

export function calculateCartSummary(
  cartItems: Array<{
    quantity: number;
    product: { price: Prisma.Decimal | string | number };
  }>,
): CartSummaryDto {
  const subtotal = sumMoney(
    cartItems.map((item) => multiplyMoney(item.product.price, item.quantity)),
  );

  const discount = toDecimal(0);
  const tax = toDecimal(0);
  const total = subtotal.sub(discount).add(tax);

  return {
    total: serializeMoney(total),
    subtotal: serializeMoney(subtotal),
    discount: serializeMoney(discount),
    tax: serializeMoney(tax),
  };
}
