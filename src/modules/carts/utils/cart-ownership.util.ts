import { ForbiddenException } from '@nestjs/common';

export function assertUserOwnsCartOrOrder(
  userId: string,
  ownerUserId: string,
): void {
  if (ownerUserId !== userId) {
    throw new ForbiddenException('This resource does not belong to you');
  }
}
