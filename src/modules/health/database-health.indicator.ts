import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.healthIndicatorService.check(key);

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return check.up();
    } catch {
      return check.down('database unreachable');
    }
  }
}
