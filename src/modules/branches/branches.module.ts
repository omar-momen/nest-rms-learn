import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { BranchesDashboardController } from './branches.dashboard.controller';

@Module({
  controllers: [BranchesController, BranchesDashboardController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
