import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from './guards/access-token';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
