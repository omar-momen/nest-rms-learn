import { Module } from '@nestjs/common';

import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';

@Module({
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}
