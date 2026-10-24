import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { CacheService } from './cache.service';

/**
 * Integration test: needs the local Redis from Docker (REDIS_HOST/REDIS_PORT,
 * defaulting to localhost:6379). Touches only its own `cache:test:*` keys.
 */
const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT ?? '6379'),
};

const keyPrefix = `cache:test:${process.pid}:${Date.now()}`;
const testKey = (name: string) => `${keyPrefix}:${name}`;

describe('CacheService (real Redis)', () => {
  let cache: CacheService;
  /** Raw client to check what Redis actually stores, such as a key's TTL. */
  let inspector: Redis;
  const createdKeys: string[] = [];

  const key = (name: string) => {
    const created = testKey(name);
    createdKeys.push(created);
    return created;
  };

  beforeAll(async () => {
    cache = new CacheService(redisOptions);
    inspector = new Redis(redisOptions);
    // Nest calls this at startup; without it the first commands race the connection.
    await cache.onModuleInit();
  });

  afterEach(async () => {
    // Delete only the exact keys this test created.
    if (createdKeys.length > 0) {
      await inspector.del(...createdKeys.splice(0));
    }
  });

  afterAll(async () => {
    await cache.onModuleDestroy();
    await inspector.quit();
  });

  it('round-trips a JSON value', async () => {
    const productsKey = key('roundtrip');
    const value = { id: 'p1', name: 'Latte', price: 3.5, tags: ['hot'] };

    await cache.setJson(productsKey, value, 60);

    expect(await cache.getJson<typeof value>(productsKey)).toEqual(value);
    expect(await inspector.get(productsKey)).toBe(JSON.stringify(value));
  });

  it('returns null for a key that does not exist', async () => {
    expect(await cache.getJson(key('missing'))).toBeNull();
  });

  it('stores the key with the requested TTL', async () => {
    const ttlKey = key('ttl');

    await cache.setJson(ttlKey, { ok: true }, 60);

    const ttl = await inspector.ttl(ttlKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('expires the key after its TTL', async () => {
    const expiringKey = key('expiring');

    await cache.setJson(expiringKey, { ok: true }, 1);
    expect(await cache.getJson(expiringKey)).toEqual({ ok: true });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(await cache.getJson(expiringKey)).toBeNull();
  });

  it('refuses to cache without a valid TTL', async () => {
    const noTtlKey = key('no-ttl');

    await cache.setJson(noTtlKey, { ok: true }, 0);

    expect(await inspector.exists(noTtlKey)).toBe(0);
  });

  it('deletes only the exact keys it is given', async () => {
    const deletedKey = key('deleted');
    const keptKey = key('kept');
    await cache.setJson(deletedKey, { n: 1 }, 60);
    await cache.setJson(keptKey, { n: 2 }, 60);

    await cache.del(deletedKey);

    expect(await cache.getJson(deletedKey)).toBeNull();
    expect(await cache.getJson(keptKey)).toEqual({ n: 2 });
  });

  it('treats a value that is not valid JSON as a miss', async () => {
    const corruptKey = key('corrupt');
    await inspector.set(corruptKey, '{not json', 'EX', 60);

    expect(await cache.getJson(corruptKey)).toBeNull();
  });

  it('skips a value that cannot be serialized without throwing', async () => {
    const circularKey = key('circular');
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(
      cache.setJson(circularKey, circular, 60),
    ).resolves.toBeUndefined();
    expect(await inspector.exists(circularKey)).toBe(0);
  });
});

describe('CacheService (Redis unreachable)', () => {
  // Port 1: nothing listens there, so every command fails.
  const cache = new CacheService({ host: '127.0.0.1', port: 1 });
  let warn: jest.SpyInstance;

  beforeAll(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(async () => {
    warn.mockRestore();
    await cache.onModuleDestroy();
  });

  it('starts without throwing after at most the connect timeout', async () => {
    const started = Date.now();
    await expect(cache.onModuleInit()).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(2500);
  });

  it('reads as a miss, quickly, instead of throwing or waiting', async () => {
    const started = Date.now();
    expect(await cache.getJson('cache:test:unreachable')).toBeNull();
    expect(Date.now() - started).toBeLessThan(100);
  });

  it('skips writes and deletes without throwing', async () => {
    await expect(
      cache.setJson('cache:test:unreachable', { ok: true }, 60),
    ).resolves.toBeUndefined();
    await expect(cache.del('cache:test:unreachable')).resolves.toBeUndefined();
  });
});
