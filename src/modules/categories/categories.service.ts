import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';

import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.prisma.category.create({ data });
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    return this.prisma.category.findMany();
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    data: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing products',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
