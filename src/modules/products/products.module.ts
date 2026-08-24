import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsDashboardController } from './products.dashboard.controller';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { InventoriesModule } from '@/modules/inventories/inventories.module';

@Module({
  imports: [CategoriesModule, InventoriesModule],
  controllers: [ProductsController, ProductsDashboardController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
