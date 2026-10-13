import { Module } from '@nestjs/common';

import { OrderCreatedEmailListener } from './listeners/order-created-email.listener';
import { OrderStatusChangedEmailListener } from './listeners/order-status-changed-email.listener';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [
    NotificationsService,
    OrderCreatedEmailListener,
    OrderStatusChangedEmailListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
