import { Module } from '@nestjs/common';

import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
