import {
  Body,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@DashboardController('products')
export class ProductsDashboardController {
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

  @Post()
  @RequirePermissions(Permission.PRODUCTS_WRITE)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCTS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCTS_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
