import { Logger } from '@nestjs/common';

import { type EmailMessage, EmailSender } from './email.sender';

/** Non-production email sender. Logs the full message so codes and content are visible locally. */
export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger(LogEmailSender.name);

  send({ to, subject, html }: EmailMessage): Promise<void> {
    this.logger.log(`To ${to}: "${subject}"\n${html}`);
    return Promise.resolve();
  }
}
