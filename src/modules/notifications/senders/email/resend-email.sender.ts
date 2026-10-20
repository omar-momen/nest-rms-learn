import { Logger } from '@nestjs/common';
import { type ErrorResponse, Resend } from 'resend';

import {
  EmailDeliveryError,
  type EmailMessage,
  EmailSender,
  type SendEmailOptions,
} from './email.sender';

/** Resend errors that may clear up on their own. Other 4xx errors (bad address, bad key, quota) will not. */
const RETRYABLE_ERRORS = new Set<ErrorResponse['name']>([
  'rate_limit_exceeded',
  'concurrent_idempotent_requests',
]);

/** Production email sender. Delivers through Resend. */
export class ResendEmailSender extends EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    super();
    this.resend = new Resend(apiKey);
  }

  /** Network errors thrown by the Resend client propagate as-is and are retried. */
  async send(
    { to, subject, html }: EmailMessage,
    options?: SendEmailOptions,
  ): Promise<void> {
    const { error } = await this.resend.emails.send(
      { from: this.from, to, subject, html },
      { idempotencyKey: options?.idempotencyKey },
    );

    if (error) {
      throw new EmailDeliveryError(
        `Email to ${to} was rejected: ${error.message}`,
        this.isRetryable(error),
      );
    }

    this.logger.log(`Sent "${subject}" to ${to}`);
  }

  private isRetryable(error: ErrorResponse): boolean {
    // No status code means the request never got a response (network failure).
    if (error.statusCode === null || error.statusCode >= 500) {
      return true;
    }

    return RETRYABLE_ERRORS.has(error.name);
  }
}
