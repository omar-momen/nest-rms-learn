import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrderType, PrismaClient } from '@generated/prisma/client';
import type { Prisma } from '@generated/prisma/client';
import { isLessThanMoney, serializeMoney } from '@/utils/money.util';

import { CouponResponseDto } from '@/modules/coupons/dto/coupon-response.dto';

type CheckoutDb = Pick<
  PrismaClient | Prisma.TransactionClient,
  'branch' | 'address' | 'coupon'
>;

export type CheckoutFulfillmentInput = {
  userId: string;
  type: OrderType;
  branchId: string;
  addressId?: string;
  couponCode?: string;
};

async function assertBranchAvailable(
  db: CheckoutDb,
  branchId: string,
): Promise<void> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  // if (branch.closed) {
  //   throw new BadRequestException('Branch is closed');
  // }
  // if (branch.busy) {
  //   throw new BadRequestException('Branch is busy');
  // }
}

async function assertUserAddressForDelivery(
  db: CheckoutDb,
  userId: string,
  addressId: string | undefined,
  branchId: string,
): Promise<void> {
  if (!addressId) {
    throw new BadRequestException('Address ID is required for delivery');
  }

  const address = await db.address.findUnique({
    where: { id: addressId, userId },
  });

  if (!address) {
    throw new NotFoundException('Address not found');
  }

  const branch = await db.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  // TODO: check if the address is in the branch's service area
}

async function assertCouponAvailable(
  db: CheckoutDb,
  couponCode: string,
  orderAmount: Prisma.Decimal | string | number,
  fulfillmentPlace: 'cart' | 'order',
): Promise<Partial<CouponResponseDto> | undefined | null> {
  const coupon = await db.coupon.findUnique({
    where: { code: couponCode },
  });
  if (!coupon) {
    throw new NotFoundException('Coupon not found');
  }

  if (!coupon.isActive) {
    throw new BadRequestException(
      'Coupon is not active. Please contact support.',
    );
  }

  if (coupon.expireDate && coupon.expireDate < new Date()) {
    throw new BadRequestException(
      'Coupon has expired. Please contact support.',
    );
  }

  if (coupon.startDate && coupon.startDate > new Date()) {
    throw new BadRequestException(
      'Coupon is not yet active. Please try again later.',
    );
  }

  if (
    coupon.minOrderAmount != null &&
    isLessThanMoney(orderAmount, coupon.minOrderAmount)
  ) {
    throw new BadRequestException(
      'Cart total is below the coupon minimum order amount.',
    );
  }

  if (coupon.usageCount >= coupon.usageLimit) {
    throw new BadRequestException('Coupon usage limit has been reached.');
  }

  if (fulfillmentPlace === 'order') {
    await db.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    });
  }

  return {
    code: coupon.code,
    type: coupon.type,
    value: serializeMoney(coupon.value),
    maxDiscountAmount: serializeMoney(coupon.maxDiscountAmount),
  };
}

/**
 * Shared checkout fulfillment checks for cart validate and order create.
 * `orderAmount` should be the pre-coupon subtotal used for min-order checks.
 */
export async function assertCheckoutFulfillment(
  db: CheckoutDb,
  input: CheckoutFulfillmentInput,
  orderAmount: Prisma.Decimal | string | number,
  fulfillmentPlace: 'cart' | 'order',
): Promise<{ coupon: Partial<CouponResponseDto> | undefined | null }> {
  await assertBranchAvailable(db, input.branchId);

  if (input.addressId && input.type === OrderType.DELIVERY) {
    await assertUserAddressForDelivery(
      db,
      input.userId,
      input.addressId,
      input.branchId,
    );
  }

  if (input.addressId && input.type != OrderType.DELIVERY) {
    throw new BadRequestException(
      'Address ID is only allowed for delivery orders. Please remove the address ID from the request.',
    );
  }

  if (!input.couponCode) {
    return { coupon: null };
  }

  const coupon = await assertCouponAvailable(
    db,
    input.couponCode,
    orderAmount,
    fulfillmentPlace,
  );

  return { coupon };
}
