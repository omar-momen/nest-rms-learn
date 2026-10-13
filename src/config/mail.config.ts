import { registerAs } from '@nestjs/config';

/** Resend settings. Keys are required only when NODE_ENV is production. */
export const mailConfig = registerAs('mail', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  from: process.env.MAIL_FROM,
}));
