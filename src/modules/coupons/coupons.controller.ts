import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { ParseUuidPipe } from '@/common/pipes';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

@DashboardController('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ============ CUSTOMER METHODS ============

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.couponsService.findOne(id);
  }

  // ============ DASHBOARD METHODS ============

  @Post()
  @RequirePermissions(Permission.COUPONS_WRITE)
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COUPONS_WRITE)
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COUPONS_WRITE)
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.couponsService.remove(id);
  }
}
