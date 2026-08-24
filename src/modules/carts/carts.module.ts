import { Module } from '@nestjs/common';

import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { ProductsModule } from '../products/products.module';
import { InventoriesModule } from '@/modules/inventories/inventories.module';

@Module({
  imports: [ProductsModule, InventoriesModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
