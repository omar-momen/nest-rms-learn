import { Injectable } from '@nestjs/common';

import { OrderStatus } from '@generated/prisma/enums';

import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/modules/orders/events';

import { type EmailMessage, EmailSender } from './senders/email';

/** Decides which emails go out and builds them. Delivery is the channel sender's job. */
@Injectable()
export class NotificationsService {
  constructor(private readonly emailSender: EmailSender) {}

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await this.emailSender.send({
      to: email,
      subject: 'Your password reset code',
      html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>If you did not request this, you can ignore this email.</p>`,
    });
  }

  async sendOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.emailSender.send({
      to: event.email,
      subject: 'Your order is confirmed',
      html: `<p>We received order ${event.orderId}.</p><p>Total: ${event.total}.</p>`,
    });
  }

  /** Only CONFIRMED, COMPLETED, and CANCELLED send mail. */
  async sendOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const message = this.statusChangedMessage(event);
    if (!message) {
      return;
    }

    await this.emailSender.send(message);
  }

  private statusChangedMessage(
    event: OrderStatusChangedEvent,
  ): EmailMessage | undefined {
    switch (event.to) {
      case OrderStatus.CONFIRMED:
        return {
          to: event.email,
          subject: 'Your order is being prepared',
          html: `<p>Order ${event.orderId} is confirmed and being prepared.</p>`,
        };
      case OrderStatus.COMPLETED:
        return {
          to: event.email,
          subject: 'Your order is complete',
          html: `<p>Order ${event.orderId} is complete.</p>`,
        };
      case OrderStatus.CANCELLED:
        return {
          to: event.email,
          subject: 'Your order was cancelled',
          html: `<p>Order ${event.orderId} was cancelled.</p>`,
        };
      default:
        return undefined;
    }
  }
}
