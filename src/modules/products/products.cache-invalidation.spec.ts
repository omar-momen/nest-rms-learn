import { Logger, NotFoundException } from '@nestjs/common';

import { CacheService } from '@/modules/cache/cache.service';
import { CategoriesService } from '@/modules/categories/categories.service';
import { InventoriesService } from '@/modules/inventories/inventories.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { toDecimal } from '@/utils/money.util';

import { PRODUCTS_LIST_CACHE_KEYS } from './products.cache';
import { ProductsService } from './products.service';

const category = {
  id: 'c1',
  name: { en: 'Drinks', ar: 'مشروبات' },
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const product = {
  id: 'p1',
  name: 'Latte',
  description: null,
  price: toDecimal('3.50'),
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  categoryId: category.id,
  category,
};

function mockPrisma() {
  return {
    product: {
      create: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue(product),
      findUnique: jest.fn().mockResolvedValue(product),
      count: jest.fn().mockResolvedValue(0),
    },
    category: {
      findUnique: jest.fn().mockResolvedValue(category),
      update: jest.fn().mockResolvedValue(category),
      delete: jest.fn().mockResolvedValue(category),
    },
  };
}

function mockCache() {
  return { del: jest.fn().mockResolvedValue(undefined) };
}

describe('products list cache invalidation', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache: ReturnType<typeof mockCache>;
  let categories: CategoriesService;
  let products: ProductsService;

  beforeEach(() => {
    prisma = mockPrisma();
    cache = mockCache();
    categories = new CategoriesService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );
    products = new ProductsService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      categories,
      {} as InventoriesService,
    );
  });

  it('targets exactly the English and Arabic list keys', () => {
    expect(PRODUCTS_LIST_CACHE_KEYS).toEqual([
      'cache:products:list:en',
      'cache:products:list:ar',
    ]);
  });

  describe.each([
    {
      name: 'product create',
      run: () =>
        products.create({ name: 'Latte', price: '3.50', categoryId: 'c1' }),
      write: () => prisma.product.create,
    },
    {
      name: 'product update',
      run: () => products.update('p1', { name: 'Flat white' }),
      write: () => prisma.product.update,
    },
    {
      name: 'product remove',
      run: () => products.remove('p1'),
      write: () => prisma.product.update,
    },
    {
      name: 'category update',
      run: () =>
        categories.update('c1', { name: { en: 'Beverages', ar: 'مشروبات' } }),
      write: () => prisma.category.update,
    },
    {
      name: 'category remove',
      run: () => categories.remove('c1'),
      write: () => prisma.category.delete,
    },
  ])('$name', ({ run, write }) => {
    it('deletes both list keys after the database write', async () => {
      await run();

      expect(cache.del).toHaveBeenCalledTimes(1);
      expect(cache.del).toHaveBeenCalledWith(...PRODUCTS_LIST_CACHE_KEYS);
      expect(write().mock.invocationCallOrder[0]).toBeLessThan(
        cache.del.mock.invocationCallOrder[0],
      );
    });

    it('leaves the cache alone when the database write fails', async () => {
      write().mockRejectedValueOnce(new Error('db down'));

      await expect(run()).rejects.toThrow('db down');
      expect(cache.del).not.toHaveBeenCalled();
    });
  });

  it('leaves the cache alone when the product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValueOnce(null);

    await expect(products.update('missing', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('leaves the cache alone when a category with products cannot be deleted', async () => {
    prisma.product.count.mockResolvedValueOnce(2);

    await expect(categories.remove('c1')).rejects.toThrow();
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('still succeeds and logs when Redis is unreachable', async () => {
    // A real CacheService pointed at a port where nothing listens.
    const unreachable = new CacheService({ host: '127.0.0.1', port: 1 });
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const service = new ProductsService(
      prisma as unknown as PrismaService,
      unreachable,
      categories,
      {} as InventoriesService,
    );

    try {
      await expect(
        service.update('p1', { name: 'Flat white' }),
      ).resolves.toMatchObject({ id: 'p1' });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Cache delete failed for cache:products:list:en, cache:products:list:ar',
        ),
      );
    } finally {
      warn.mockRestore();
      await unreachable.onModuleDestroy();
    }
  });
});
