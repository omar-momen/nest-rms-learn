import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';
import { Prisma, Product } from '../../generated/prisma/client';

import { CategoryService } from '../category/category.service';

import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, ...productData } = createProductDto;

    // Get Category to check if it exists and then connect it to the product
    const category = await this.categoryService.findOne(categoryId);

    // Create Product
    const product = await this.prisma.product.create({
      data: { ...productData, category: { connect: { id: category.id } } },
    });
    if (!product) {
      throw new BadRequestException('Failed to create product');
    }
    return product;
  }

  findAll() {
    return `This action returns all products`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
