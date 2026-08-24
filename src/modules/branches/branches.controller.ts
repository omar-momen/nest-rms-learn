import { Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { BranchesService } from './branches.service';

@AppController('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.findOne(id);
  }
}
