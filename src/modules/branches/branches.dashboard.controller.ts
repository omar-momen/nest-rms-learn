import {
  Body,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@DashboardController('branches')
export class BranchesDashboardController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.BRANCHES_WRITE)
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BRANCHES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BRANCHES_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.remove(id);
  }
}
