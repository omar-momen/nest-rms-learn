import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { authRouteThrottles } from './auth-route-throttles';
import type { AuthRouteThrottles } from './throttler.types';

const isDevelopment = process.env.NODE_ENV === 'development';

/** Applies auth route limits in production; in development only global limits apply. */
export function AuthRouteThrottle(route: keyof AuthRouteThrottles) {
  if (isDevelopment) {
    return applyDecorators();
  }

  return applyDecorators(Throttle(authRouteThrottles[route]));
}
