import { BadRequestException } from '@nestjs/common';

export type LedgerDirection = 'CREDIT' | 'DEBIT';

/**
 * API/order code always sends a positive magnitude. Sign is derived here
 * so callers never mix "25 means redeem" with a stored -25.
 */
export function signedDelta(
  magnitude: number,
  direction: LedgerDirection,
): number {
  if (!Number.isInteger(magnitude) || magnitude < 1) {
    throw new BadRequestException('Quantity must be an integer of at least 1');
  }

  return direction === 'CREDIT' ? magnitude : -magnitude;
}
