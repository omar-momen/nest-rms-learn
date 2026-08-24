import { Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { LoyaltyTransactionsService } from './loyalty-transactions.service';

@AppController('loyalty-transactions')
export class LoyaltyTransactionsController {
  constructor(
    private readonly loyaltyTransactionsService: LoyaltyTransactionsService,
  ) {}

  @Get()
  findAll() {
    return this.loyaltyTransactionsService.findAll();
  }

  @Get('balance')
  getBalance() {
    return this.loyaltyTransactionsService.getBalance();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loyaltyTransactionsService.findOne(id);
  }
}
