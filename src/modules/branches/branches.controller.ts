import { Get, Param } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { ParseUuidPipe } from '@/common/pipes';
import { BranchesService } from './branches.service';

@AppController('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.branchesService.findOne(id);
  }
}
