import { ForbiddenException } from '@nestjs/common';

/** Defensive ownership check for cart and order aggregates. */
export function assertUserOwnsCartOrOrder(
  userId: string,
  ownerUserId: string,
): void {
  if (ownerUserId !== userId) {
    throw new ForbiddenException('This resource does not belong to you');
  }
}
