import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { setTimeout as sleep } from 'node:timers/promises';

import { OrderStatus } from '@generated/prisma/enums';

import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/modules/orders/events';

import { EMAIL_QUEUE, SEND_EMAIL_JOB } from './queues/email.queue';
import type { EmailMessage } from './senders/email';

/** BullMQ waits for Redis indefinitely, so cap how long a request waits to queue an email. */
const QUEUE_EMAIL_TIMEOUT_MS = 3000;

/**
 * Decides which emails go out and builds them, then queues them. Delivery
 * happens in `EmailProcessor` through the channel sender.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Your password reset code',
      html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>If you did not request this, you can ignore this email.</p>`,
    });
  }

  async sendOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.queueEmail({
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

    await this.queueEmail(message);
  }

  /**
   * Never throws, like a failed send. If Redis is down the caller stops waiting
   * after the timeout; BullMQ still adds the job if Redis comes back.
   */
  private async queueEmail(message: EmailMessage): Promise<void> {
    const timeout = new AbortController();

    try {
      await Promise.race([
        this.emailQueue.add(SEND_EMAIL_JOB, message),
        sleep(QUEUE_EMAIL_TIMEOUT_MS, undefined, {
          signal: timeout.signal,
        }).then(() => {
          throw new Error(`timed out after ${QUEUE_EMAIL_TIMEOUT_MS}ms`);
        }),
      ]);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Could not queue email to ${message.to}: ${reason}`);
    } finally {
      timeout.abort();
    }
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
