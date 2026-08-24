import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersDashboardController } from './orders.dashboard.controller';
import { LoyaltyTransactionsModule } from '@/modules/loyalty-transactions/loyalty-transactions.module';
import { InventoriesModule } from '@/modules/inventories/inventories.module';

@Module({
  imports: [LoyaltyTransactionsModule, InventoriesModule],
  controllers: [OrdersController, OrdersDashboardController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
