import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from './guards/access-token';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
