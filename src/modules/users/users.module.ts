import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersDashboardController } from './users.dashboard.controller';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UsersDashboardController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
