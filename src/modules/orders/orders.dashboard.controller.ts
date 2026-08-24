import { Body, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { OrdersService } from './orders.service';
import { ChangeStatusDto } from './dto';

@DashboardController('orders')
export class OrdersDashboardController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions(Permission.ORDERS_MANAGE)
  findAll() {
    return this.ordersService.findAllForDashboard();
  }

  @Get(':id')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneForDashboard(id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeStatusDto,
  ) {
    return this.ordersService.changeStatus(id, changeStatusDto);
  }
}
