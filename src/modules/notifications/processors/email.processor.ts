import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';

import { EMAIL_QUEUE } from '../queues/email.queue';
import {
  EmailDeliveryError,
  type EmailMessage,
  EmailSender,
} from '../senders/email';

/**
 * Worker for the email queue. Delivery itself is the `EmailSender`'s job.
 * Retries and backoff come from the queue's `defaultJobOptions`.
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailSender: EmailSender) {
    super();
  }

  async process(job: Job<EmailMessage>): Promise<void> {
    try {
      await this.emailSender.send(job.data, {
        idempotencyKey: `${EMAIL_QUEUE}-${job.id}-${job.timestamp}`,
      });
    } catch (error: unknown) {
      // Skip the remaining attempts when retrying cannot help.
      if (error instanceof EmailDeliveryError && !error.retryable) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  /** Fires after every failed attempt, including ones that will be retried. */
  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailMessage> | undefined, error: Error) {
    if (!job) {
      return;
    }

    // attemptsMade already includes the attempt that just failed.
    const willRetry =
      job.attemptsMade < (job.opts.attempts ?? 1) &&
      !(error instanceof UnrecoverableError);

    if (willRetry) {
      this.logger.warn(
        `Email job ${job.id} to ${job.data.to} failed attempt ${job.attemptsMade}/${job.opts.attempts}, retrying in ${job.delay}ms: ${error.message}`,
      );
      return;
    }

    this.logger.error(
      `Email job ${job.id} to ${job.data.to} failed after ${job.attemptsMade} attempt(s): ${error.message}`,
    );
  }
}
