export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailOptions = {
  /** Same key on a retry means the provider sends the email at most once. */
  idempotencyKey?: string;
};

/** Thrown by senders. `retryable` is false when trying again cannot help (e.g. an invalid address). */
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = EmailDeliveryError.name;
  }
}

/** Contract and injection token for the email channel. Chosen per environment in senders.providers.ts. */
export abstract class EmailSender {
  /** Throws on failure so the queue can retry. Only `EmailProcessor` calls this. */
  abstract send(
    message: EmailMessage,
    options?: SendEmailOptions,
  ): Promise<void>;
}
