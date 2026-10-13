import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

import { type EmailMessage, EmailSender } from './email.sender';

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

  async send({ to, subject, html }: EmailMessage): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Email to ${to} was rejected: ${error.message}`);
        return;
      }

      this.logger.log(`Sent "${subject}" to ${to}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Email to ${to} failed: ${message}`);
    }
  }
}
