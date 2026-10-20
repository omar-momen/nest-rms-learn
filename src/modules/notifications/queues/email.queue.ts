/** BullMQ queue holding outgoing emails until `EmailProcessor` delivers them. */
export const EMAIL_QUEUE = 'email';

/** One job per email. Job data is an `EmailMessage`. */
export const SEND_EMAIL_JOB = 'send-email';
