import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

import {
  getEmailRateLimitTracker,
  getIpRateLimitTracker,
  skipEmailRateLimitWhenMissing,
} from './rate-limit-tracker.util';

export const throttlers: ThrottlerOptions[] = [
  {
    name: 'default',
    ttl: minutes(1),
    limit: 60,
    getTracker: getIpRateLimitTracker,
  },
  {
    name: 'authEmail',
    ttl: minutes(1),
    limit: 10,
    getTracker: getEmailRateLimitTracker,
    skipIf: skipEmailRateLimitWhenMissing,
  },
];
