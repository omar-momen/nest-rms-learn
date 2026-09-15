import { ForbiddenException } from '@nestjs/common';

/** Defensive ownership check for cart and order aggregates. */
export function assertUserOwnsCartOrOrder(
  userId: string,
  ownerUserId: string,
): void {
  if (ownerUserId !== userId) {
    throw new ForbiddenException('errors.resource_not_owned');
  }
}
