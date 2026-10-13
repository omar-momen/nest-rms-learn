export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

/** Contract and injection token for the email channel. Chosen per environment in senders.providers.ts. */
export abstract class EmailSender {
  /** Never throws. Failures are logged so callers' responses stay unchanged. */
  abstract send(message: EmailMessage): Promise<void>;
}
