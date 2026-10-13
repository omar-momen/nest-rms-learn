import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  ORDER_STATUS_CHANGED,
  type OrderStatusChangedEvent,
} from '@/modules/orders/events';

import { NotificationsService } from '../notifications.service';

@Injectable()
export class OrderStatusChangedEmailListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(ORDER_STATUS_CHANGED)
  async handle(event: OrderStatusChangedEvent): Promise<void> {
    await this.notificationsService.sendOrderStatusChanged(event);
  }
}
