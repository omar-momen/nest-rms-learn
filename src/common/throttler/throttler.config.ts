import type { ThrottlerOptions } from '@nestjs/throttler';

import * as developmentLimits from './development.limits';
import * as productionLimits from './production.limits';
import {
  getEmailRateLimitTracker,
  getIpRateLimitTracker,
  skipEmailRateLimitWhenMissing,
} from './trackers.util';

const isDevelopment = process.env.NODE_ENV === 'development';

const appThrottlerLimits = isDevelopment
  ? developmentLimits.appThrottlerLimits
  : productionLimits.appThrottlerLimits;

export const appThrottlerOptions: ThrottlerOptions[] = [
  {
    name: 'default',
    limit: appThrottlerLimits.default.limit,
    ttl: appThrottlerLimits.default.ttl,
    getTracker: getIpRateLimitTracker,
  },
  {
    name: 'authEmail',
    limit: appThrottlerLimits.authEmail.limit,
    ttl: appThrottlerLimits.authEmail.ttl,
    getTracker: getEmailRateLimitTracker,
    skipIf: skipEmailRateLimitWhenMissing,
  },
];
