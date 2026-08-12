import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { CategoriesService } from '@/modules/categories/categories.service';
import { serializeMoney } from '@/utils/money.util';

import { CreateProductDto, ProductResponseDto, UpdateProductDto } from './dto';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { categoryId, ...productData } = createProductDto;

    const category = await this.categoriesService.findOne(categoryId);

    const product = await this.prisma.product.create({
      data: { ...productData, category: { connect: { id: category.id } } },
      include: { category: true },
    });

    return this.toResponseDto(product);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
      },
    });

    return products.map((product) => this.toResponseDto(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toResponseDto(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    await this.findOne(id);

    const { categoryId, ...productData } = updateProductDto;

    if (categoryId) {
      await this.categoriesService.findOne(categoryId);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
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

  private toResponseDto(product: ProductWithCategory): ProductResponseDto {
    return { ...product, price: serializeMoney(product.price) };
  }
}
