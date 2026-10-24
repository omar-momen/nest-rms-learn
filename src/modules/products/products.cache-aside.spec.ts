import { Logger } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

import { CacheService } from '@/modules/cache/cache.service';
import { CategoriesService } from '@/modules/categories/categories.service';
import { InventoriesService } from '@/modules/inventories/inventories.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { toDecimal } from '@/utils/money.util';

import { ProductResponseDto } from './dto';
import { ProductsService } from './products.service';

const product = {
  id: 'p1',
  name: 'Latte',
  description: null,
  price: toDecimal('3.50'),
  isAvailable: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  categoryId: 'c1',
  category: {
    id: 'c1',
    name: { en: 'Drinks', ar: 'مشروبات' },
    description: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

/** What a cached list looks like after the JSON round trip through Redis. */
const cachedList = [
  {
    id: 'p1',
    name: 'Latte (cached)',
    price: '3.50',
    categoryId: 'c1',
  },
] as unknown as ProductResponseDto[];

function setup(cache: Partial<CacheService>) {
  const prisma = {
    product: { findMany: jest.fn().mockResolvedValue([product]) },
  };
  const inventories = {
    getQuantitiesByProductId: jest.fn().mockResolvedValue(new Map([['p1', 7]])),
  };
  const service = new ProductsService(
    prisma as unknown as PrismaService,
    cache as CacheService,
    {} as CategoriesService,
    inventories as unknown as InventoriesService,
  );
  return { service, prisma, inventories };
}

function mockCache(cached: ProductResponseDto[] | null) {
  return {
    getJson: jest.fn().mockResolvedValue(cached),
    setJson: jest.fn().mockResolvedValue(undefined),
  };
}

function withLanguage(lang: string) {
  jest
    .spyOn(I18nContext, 'current')
    .mockReturnValue({ lang } as unknown as I18nContext);
}

describe('GET /app/products cache-aside', () => {
  afterEach(() => jest.restoreAllMocks());

  it('serves a hit from the cache without querying products', async () => {
    const cache = mockCache(cachedList);
    const { service, prisma } = setup(cache);

    expect(await service.findAllLocalized()).toEqual(cachedList);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(cache.setJson).not.toHaveBeenCalled();
  });

  it('builds a miss from the database and caches it for 60 seconds', async () => {
    const cache = mockCache(null);
    const { service, prisma } = setup(cache);

    const result = await service.findAllLocalized();

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({ name: 'Latte', price: '3.50' });
    expect(result[0].category?.name).toBe('Drinks');
    expect(cache.setJson).toHaveBeenCalledWith(
      'cache:products:list:en',
      result,
      60,
    );
  });

  it.each([
    ['ar', 'cache:products:list:ar', 'مشروبات'],
    ['ar-EG', 'cache:products:list:ar', 'مشروبات'],
    ['en-US', 'cache:products:list:en', 'Drinks'],
    ['fr', 'cache:products:list:en', 'Drinks'],
  ])(
    'keeps languages apart: %s uses %s',
    async (lang, expectedKey, categoryName) => {
      withLanguage(lang);
      const cache = mockCache(null);
      const { service } = setup(cache);

      const result = await service.findAllLocalized();

      expect(cache.getJson).toHaveBeenCalledWith(expectedKey);
      expect(cache.setJson).toHaveBeenCalledWith(expectedKey, result, 60);
      expect(result[0].category?.name).toBe(categoryName);
    },
  );

  it('merges live stock into a cache hit on every branch request', async () => {
    const cache = mockCache(cachedList);
    const { service, inventories } = setup(cache);

    const first = await service.findAllLocalized('branch-1');
    inventories.getQuantitiesByProductId.mockResolvedValueOnce(
      new Map([['p1', 2]]),
    );
    const second = await service.findAllLocalized('branch-1');

    expect(first[0]).toMatchObject({
      name: 'Latte (cached)',
      availableStock: 7,
    });
    expect(second[0]).toMatchObject({
      name: 'Latte (cached)',
      availableStock: 2,
    });
    expect(inventories.getQuantitiesByProductId).toHaveBeenCalledTimes(2);
    expect(cachedList[0]).not.toHaveProperty('availableStock');
  });

  it('never writes stock to the cache on a branch miss', async () => {
    const cache = mockCache(null);
    const { service } = setup(cache);

    const result = await service.findAllLocalized('branch-1');

    expect(result[0].availableStock).toBe(7);
    const [, cachedValue] = cache.setJson.mock.calls[0] as [
      string,
      ProductResponseDto[],
    ];
    expect(cachedValue[0]).not.toHaveProperty('availableStock');
  });

  it('falls back to the database when Redis is unreachable', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const unreachable = new CacheService({ host: '127.0.0.1', port: 1 });
    const { service, prisma } = setup(unreachable);

    try {
      const result = await service.findAllLocalized('branch-1');

      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(result[0]).toMatchObject({ name: 'Latte', availableStock: 7 });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache read failed'),
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache write failed'),
      );
    } finally {
      await unreachable.onModuleDestroy();
    }
  });
});
