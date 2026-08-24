import { Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { ProductsService } from './products.service';

@AppController('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
  ) {
    return this.productsService.findAll(branchId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
  ) {
    return this.productsService.findOne(id, branchId);
  }
}
