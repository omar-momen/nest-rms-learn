import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';

import { CartItemsModule } from '../cart-items/cart-items.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [CartItemsModule, ProductsModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
