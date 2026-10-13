import { OrderStatus } from '@generated/prisma/enums';

/** Emitted after a status change commits. Skipped when the status is unchanged. */
export const ORDER_STATUS_CHANGED = 'order.status_changed';

export type OrderStatusChangedEvent = {
  orderId: string;
  userId: string;
  email: string;
  from: OrderStatus;
  to: OrderStatus;
};
