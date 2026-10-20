import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { EMAIL_QUEUE } from '../queues/email.queue';
import { type EmailMessage, EmailSender } from '../senders/email';

/** Worker for the email queue. Delivery itself is the `EmailSender`'s job. */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailSender: EmailSender) {
    super();
  }

  async process(job: Job<EmailMessage>): Promise<void> {
    await this.emailSender.send(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailMessage> | undefined, error: Error) {
    this.logger.error(
      `Email job ${job?.id} to ${job?.data.to} failed: ${error.message}`,
    );
  }
}
