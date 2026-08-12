import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '@/modules/auth/decorators/public.decorator';

@SkipThrottle()
@Controller()
export class AppController {
  @Public()
  @Get()
  getHello(): string {
    return 'Hello World';
  }
}
