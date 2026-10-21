import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';

import { redisConfig } from '@/config';

/** Give up quickly so a slow or missing Redis never slows a request down. */
const CONNECT_TIMEOUT_MS = 2000;
const COMMAND_TIMEOUT_MS = 500;
const MAX_RECONNECT_DELAY_MS = 2000;

/**
 * JSON cache on its own Redis connection, separate from BullMQ's.
 *
 * Never throws: when Redis is down or a value is unreadable, reads return null
 * and writes are skipped, so callers fall back to the database.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  /** Log a lost connection once, not on every reconnect attempt. */
  private connectionErrorLogged = false;

  constructor(@Inject(redisConfig.KEY) redis: ConfigType<typeof redisConfig>) {
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      connectionName: 'cache',
      connectTimeout: CONNECT_TIMEOUT_MS,
      commandTimeout: COMMAND_TIMEOUT_MS,
      // Fail commands while disconnected instead of queueing them until Redis returns.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      // Keep reconnecting in the background so the cache recovers on its own.
      retryStrategy: (attempt) =>
        Math.min(attempt * 200, MAX_RECONNECT_DELAY_MS),
    });

    this.client.on('ready', () => {
      this.connectionErrorLogged = false;
      this.logger.log('Cache connected to Redis');
    });

    // Without a listener, ioredis reports every connection error as unhandled.
    this.client.on('error', (error: Error) => {
      if (this.connectionErrorLogged) {
        return;
      }
      this.connectionErrorLogged = true;
      this.logger.warn(`Cache Redis unavailable: ${error.message}`);
    });
  }

  /**
   * Waits up to the connect timeout for the first connection, so early requests
   * are not cache misses just because the socket is still opening. Never fails
   * startup: if Redis is down, the app boots and the client keeps reconnecting.
   */
  async onModuleInit(): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }

    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.client.off('ready', done);
        resolve();
      };
      const timer = setTimeout(done, CONNECT_TIMEOUT_MS);
      this.client.once('ready', done);
    });
  }

  /** Returns null on a miss, a Redis error, or a value that is not valid JSON. */
  async getJson<T>(key: string): Promise<T | null> {
    let raw: string | null;
    try {
      raw = await this.client.get(key);
    } catch (error: unknown) {
      this.logFailure('read', key, error);
      return null;
    }

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error: unknown) {
      this.logFailure('parse', key, error);
      return null;
    }
  }

  /** Every entry expires, so a missed invalidation cannot keep stale data forever. */
  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      this.logger.warn(
        `Skipped caching ${key}: TTL must be a positive integer, got ${ttlSeconds}`,
      );
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error: unknown) {
      this.logFailure('write', key, error);
    }
  }

  /** Deletes exact keys only, never patterns. */
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.client.del(...keys);
    } catch (error: unknown) {
      this.logFailure('delete', keys.join(', '), error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      // QUIT lets in-flight commands finish before the connection closes.
      await this.client.quit();
    } catch {
      // Already disconnected, so there is nothing to wait for.
      this.client.disconnect();
    }
  }

  private logFailure(action: string, key: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    this.logger.warn(`Cache ${action} failed for ${key}: ${reason}`);
  }
}
