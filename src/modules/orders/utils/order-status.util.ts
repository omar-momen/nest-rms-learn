import { BadRequestException } from '@nestjs/common';

import { OrderStatus } from '@generated/prisma/client';

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> =
  {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

export function assertAllowedStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (from === to) {
    return;
  }

  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Cannot change order status from ${from} to ${to}`,
    );
  }
}
