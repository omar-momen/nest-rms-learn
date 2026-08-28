import { Body, Delete, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';

import { UsersService } from './users.service';
import { UpdateUserAdminDto } from './dto';

@DashboardController('users')
export class UsersDashboardController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_READ)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserAdminDto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateForDashboard(id, updateUserAdminDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
