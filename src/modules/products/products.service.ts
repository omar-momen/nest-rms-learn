import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { CategoriesService } from '@/modules/categories/categories.service';
import { InventoriesService } from '@/modules/inventories/inventories.service';
import { serializeMoney, toDecimal } from '@/utils/money.util';

import { CreateProductDto, ProductResponseDto, UpdateProductDto } from './dto';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly inventoriesService: InventoriesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { categoryId, price, ...productData } = createProductDto;

    const category = await this.categoriesService.findOne(categoryId);

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        price: toDecimal(price),
        category: { connect: { id: category.id } },
      },
      include: { category: true },
    });

    return this.toResponseDto(product);
  }

  async findAll(branchId?: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
      },
    });

    const stockByProductId = branchId
      ? await this.inventoriesService.getQuantitiesByProductId(
          branchId,
          products.map((product) => product.id),
        )
      : undefined;

    return products.map((product) =>
      this.toResponseDto(product, stockByProductId),
    );
  }

  async findOne(id: string, branchId?: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stockByProductId = branchId
      ? await this.inventoriesService.getQuantitiesByProductId(branchId, [id])
      : undefined;

    return this.toResponseDto(product, stockByProductId);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    await this.findOne(id);

    const { categoryId, price, ...productData } = updateProductDto;

    if (categoryId) {
      await this.categoriesService.findOne(categoryId);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(price !== undefined ? { price: toDecimal(price) } : {}),
        ...(categoryId && { category: { connect: { id: categoryId } } }),
      },
      include: { category: true },
    });

    return this.toResponseDto(product);
  }

  /** Soft-unavailability — keeps FK refs on carts/orders intact. */
  async remove(id: string): Promise<ProductResponseDto> {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isAvailable: false },
      include: { category: true },
    });
    return this.toResponseDto(product);
  }

  private toResponseDto(
    product: ProductWithCategory,
    stockByProductId?: Map<string, number>,
  ): ProductResponseDto {
    return {
      ...product,
      price: serializeMoney(product.price),
      ...(stockByProductId
        ? { availableStock: stockByProductId.get(product.id) ?? 0 }
        : {}),
    };
  }
}
