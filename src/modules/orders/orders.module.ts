import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartsModule } from '@/modules/carts/carts.module';
import { OrderItemsModule } from '@/modules/order-items/order-items.module';

@Module({
  imports: [CartsModule, OrderItemsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
