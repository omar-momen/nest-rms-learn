import { minutes } from '@nestjs/throttler';

import type { AppThrottlerLimits } from './throttler.types';

/** Relaxed global throttlers for local development. */
export const appThrottlerLimits: AppThrottlerLimits = {
  default: { limit: 1200, ttl: minutes(2) },
  authEmail: { limit: 200, ttl: minutes(2) },
};
