import { registerAs } from '@nestjs/config';

/** Redis connection settings, shared by BullMQ queues and the cache client. */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: Number.parseInt(process.env.REDIS_PORT ?? '6379'),
}));
