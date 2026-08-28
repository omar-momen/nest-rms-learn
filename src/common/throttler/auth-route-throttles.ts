import { hours, minutes } from '@nestjs/throttler';

import type { AuthRouteThrottles } from './throttler.types';

/** @Throttle overrides for auth routes (same in all environments). */
export const authRouteThrottles: AuthRouteThrottles = {
  register: {
    default: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
    authEmail: { limit: 3, ttl: hours(1), blockDuration: hours(1) },
  },
  login: {
    default: { limit: 20, ttl: minutes(15), blockDuration: minutes(15) },
    authEmail: { limit: 5, ttl: minutes(15), blockDuration: minutes(15) },
  },
  refresh: {
    default: { limit: 30, ttl: minutes(1), blockDuration: minutes(1) },
  },
  forgotPassword: {
    default: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
    authEmail: { limit: 3, ttl: hours(1), blockDuration: hours(1) },
  },
  resetPassword: {
    default: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) },
  },
};
