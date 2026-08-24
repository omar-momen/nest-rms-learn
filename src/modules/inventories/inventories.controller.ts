import { Body, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { InventoriesService } from './inventories.service';
import { AdjustInventoryDto } from './dto';

@DashboardController('inventories')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post('adjust')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  adjust(@Body() adjustInventoryDto: AdjustInventoryDto) {
    return this.inventoriesService.adjust(adjustInventoryDto);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll(
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
    @Query('productId', new ParseUUIDPipe({ optional: true }))
    productId?: string,
  ) {
    return this.inventoriesService.findAll(branchId, productId);
  }

  @Get('transactions')
  @RequirePermissions(Permission.INVENTORY_READ)
  findAllTransactions(
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
    @Query('productId', new ParseUUIDPipe({ optional: true }))
    productId?: string,
    @Query('orderId', new ParseUUIDPipe({ optional: true })) orderId?: string,
  ) {
    return this.inventoriesService.findAllTransactions({
      branchId,
      productId,
      orderId,
    });
  }

  @Get('transactions/:id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOneTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoriesService.findOneTransaction(id);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoriesService.findOne(id);
  }
}
