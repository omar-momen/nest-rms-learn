import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [CategoryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
