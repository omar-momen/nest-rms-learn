import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { OrderStatus } from '@generated/prisma/enums';

import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/modules/orders/events';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | undefined;

  constructor(private readonly configService: ConfigService) {}

  /** Production only. Failures are logged; the forgot-password response stays generic. */
  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    if (!this.isProduction()) {
      return;
    }

    await this.deliver(
      email,
      'Your password reset code',
      `<p>Your password reset code is <strong>${otp}</strong>.</p><p>If you did not request this, you can ignore this email.</p>`,
    );
  }

  /** Production sends a confirmation. Other environments only log the event. */
  async sendOrderCreated(event: OrderCreatedEvent): Promise<void> {
    if (!this.isProduction()) {
      this.logger.log(
        `Order created ${event.orderId} for user ${event.userId} (total ${event.total})`,
      );
      return;
    }

    await this.deliver(
      event.email,
      'Your order is confirmed',
      `<p>We received order ${event.orderId}.</p><p>Total: ${event.total}.</p>`,
    );
  }

  /** Production sends status mail. Other environments only log the event. */
  async sendOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const message = this.statusChangedMessage(event);
    if (!message) {
      return;
    }

    if (!this.isProduction()) {
      this.logger.log(
        `Order ${event.orderId} changed from ${event.from} to ${event.to} for user ${event.userId}`,
      );
      return;
    }

    await this.deliver(event.email, message.subject, message.html);
  }

  private statusChangedMessage(
    event: OrderStatusChangedEvent,
  ): { subject: string; html: string } | undefined {
    switch (event.to) {
      case OrderStatus.CONFIRMED:
        return {
          subject: 'Your order is being prepared',
          html: `<p>Order ${event.orderId} is confirmed and being prepared.</p>`,
        };
      case OrderStatus.COMPLETED:
        return {
          subject: 'Your order is complete',
          html: `<p>Order ${event.orderId} is complete.</p>`,
        };
      case OrderStatus.CANCELLED:
        return {
          subject: 'Your order was cancelled',
          html: `<p>Order ${event.orderId} was cancelled.</p>`,
        };
      default:
        return undefined;
    }
  }

  private isProduction(): boolean {
    return this.configService.get<string>('app.environment') === 'production';
  }

  private client(): Resend {
    if (this.resend) {
      return this.resend;
    }

    const apiKey = this.configService.get<string>('mail.resendApiKey');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
    return this.resend;
  }

  private async deliver(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from');
    if (!from) {
      this.logger.error('MAIL_FROM is not configured');
      return;
    }

    try {
      const { error } = await this.client().emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Mail to ${to} was rejected: ${error.message}`);
        return;
      }

      this.logger.log(`Sent "${subject}" to ${to}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown mail error';
      this.logger.error(`Mail to ${to} failed: ${message}`);
    }
  }
}
