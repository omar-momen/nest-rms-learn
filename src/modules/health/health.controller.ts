import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { Public } from '@/modules/auth/decorators/public.decorator';
import { SkipDataResponse } from '@/common/interceptors';

import { DatabaseHealthIndicator } from './database-health.indicator';

@SkipThrottle()
@Public()
@SkipDataResponse()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealth: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.databaseHealth.isHealthy('database')]);
  }
}
