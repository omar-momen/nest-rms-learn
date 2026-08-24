import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesDashboardController } from './categories.dashboard.controller';

@Module({
  controllers: [CategoriesController, CategoriesDashboardController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
