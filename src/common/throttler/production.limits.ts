import { minutes } from '@nestjs/throttler';

import type { AppThrottlerLimits } from './throttler.types';

/** Global IP + email throttlers (production). */
export const appThrottlerLimits: AppThrottlerLimits = {
  default: { limit: 60, ttl: minutes(1) },
  authEmail: { limit: 10, ttl: minutes(1) },
};
