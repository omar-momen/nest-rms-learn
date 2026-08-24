import { Module } from '@nestjs/common';

import { LoyaltyTransactionsService } from './loyalty-transactions.service';
import { LoyaltyTransactionsController } from './loyalty-transactions.controller';

@Module({
  controllers: [LoyaltyTransactionsController],
  providers: [LoyaltyTransactionsService],
  exports: [LoyaltyTransactionsService],
})
export class LoyaltyTransactionsModule {}
