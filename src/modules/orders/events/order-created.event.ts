import { OrderType, PaymentMethod } from '@generated/prisma/enums';

/** Emitted after the checkout transaction commits. */
export const ORDER_CREATED = 'order.created';

export type OrderCreatedEvent = {
  orderId: string;
  userId: string;
  email: string;
  branchId: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  total: string;
};
