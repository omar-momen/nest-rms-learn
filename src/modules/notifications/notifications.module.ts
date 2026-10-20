import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { OrderCreatedEmailListener } from './listeners/order-created-email.listener';
import { OrderStatusChangedEmailListener } from './listeners/order-status-changed-email.listener';
import { NotificationsService } from './notifications.service';
import { EmailProcessor } from './processors/email.processor';
import { EMAIL_QUEUE } from './queues/email.queue';
import { senderProviders } from './senders/senders.providers';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    }),
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
