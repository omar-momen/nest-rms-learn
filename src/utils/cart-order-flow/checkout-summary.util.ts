import { Prisma } from '@generated/prisma/client';
import { CouponType } from '@generated/prisma/enums';

import { CheckoutSummary } from './checkout-summary';
import type { CouponResponseDto } from '@/modules/coupons/dto/coupon-response.dto';

import {
  multiplyMoney,
  serializeMoney,
  sumMoney,
  toDecimal,
} from '@/utils/money.util';

export function calculateCouponDiscount(
  subtotal: Prisma.Decimal | string | number,
  coupon: Partial<CouponResponseDto>,
): Prisma.Decimal {
  const sub = toDecimal(subtotal);
  if (sub.lte(0)) {
    return toDecimal(0);
  }

  const raw =
    coupon.type === CouponType.PERCENTAGE
      ? sub.mul(toDecimal(coupon.value ?? 0)).div(100)
      : toDecimal(coupon.value ?? 0);

  const cappedByMax = Prisma.Decimal.min(
    raw,
    toDecimal(coupon.maxDiscountAmount ?? 0),
  );

  return Prisma.Decimal.min(cappedByMax, sub);
}

export function calculateCartSummary(
  cartItems: Array<{
    quantity: number;
    product?: { price: Prisma.Decimal | string | number } | null;
  }>,
  coupon?: Partial<CouponResponseDto> | null,
): CheckoutSummary {
  const subtotal = sumMoney(
    cartItems.flatMap((item) =>
      item.product ? [multiplyMoney(item.product.price, item.quantity)] : [],
    ),
  );

  const couponDiscount = coupon
    ? calculateCouponDiscount(subtotal, coupon)
    : toDecimal(0);

  const tax = toDecimal(0);
  const discount = couponDiscount;
  const total = subtotal.sub(discount).add(tax);

  return {
    total: serializeMoney(total),
    subtotal: serializeMoney(subtotal),
    discount: serializeMoney(discount),
    tax: serializeMoney(tax),
  };
}
