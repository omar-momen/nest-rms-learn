import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailSender, LogEmailSender, ResendEmailSender } from './email';

/**
 * One provider per channel. Each picks the real sender in production and a
 * log sender everywhere else. Add new channels (e.g. SMS) here.
 */
const emailSenderProvider: Provider = {
  provide: EmailSender,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): EmailSender => {
    if (configService.get<string>('app.environment') !== 'production') {
      return new LogEmailSender();
    }

    const apiKey = configService.get<string>('mail.resendApiKey');
    const from = configService.get<string>('mail.from');
    if (!apiKey || !from) {
      throw new Error(
        'RESEND_API_KEY and MAIL_FROM are required in production',
      );
    }

    return new ResendEmailSender(apiKey, from);
  },
};

// SMS Sender Provider....

export const senderProviders: Provider[] = [emailSenderProvider];
