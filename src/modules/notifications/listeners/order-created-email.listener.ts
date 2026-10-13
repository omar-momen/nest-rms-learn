import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ORDER_CREATED, type OrderCreatedEvent } from '@/modules/orders/events';

import { NotificationsService } from '../notifications.service';

@Injectable()
export class OrderCreatedEmailListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(ORDER_CREATED)
  async handle(event: OrderCreatedEvent): Promise<void> {
    await this.notificationsService.sendOrderCreated(event);
  }
}
