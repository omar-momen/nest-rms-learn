import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { OrderCreatedEmailListener } from './listeners/order-created-email.listener';
import { OrderStatusChangedEmailListener } from './listeners/order-status-changed-email.listener';
import { NotificationsService } from './notifications.service';
import { EmailProcessor } from './processors/email.processor';
import { EMAIL_QUEUE } from './queues/email.queue';
import { senderProviders } from './senders/senders.providers';

const isDevelopment = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    }),

    // Shows the email queue in Bull Board (/queues). Reuses the queue registered above.
    ...(isDevelopment
      ? [
          BullBoardModule.forFeature({
            name: EMAIL_QUEUE,
            adapter: BullMQAdapter,
          }),
        ]
      : []),
  ],
  providers: [
    ...senderProviders,
    NotificationsService,
    EmailProcessor,
    OrderCreatedEmailListener,
    OrderStatusChangedEmailListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
