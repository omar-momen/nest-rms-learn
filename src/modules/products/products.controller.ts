import { Get, Param, Query } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { ParseUuidPipe } from '@/common/pipes';
import { ProductsService } from './products.service';

@AppController('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('branchId', new ParseUuidPipe({ optional: true })) branchId?: string,
  ) {
    return this.productsService.findAllLocalized(branchId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @Query('branchId', new ParseUuidPipe({ optional: true })) branchId?: string,
  ) {
    return this.productsService.findOneLocalized(id, branchId);
  }
}
