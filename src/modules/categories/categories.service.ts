import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';

import { parseLocalizedText, resolveLocalizedText } from '@/common/i18n.util';
import { PrismaService } from '@/modules/prisma/prisma.service';

import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryDashboardResponseDto,
} from './dto';

type CategoryRecord = Prisma.CategoryGetPayload<object>;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto): Promise<CategoryDashboardResponseDto> {
    const category = await this.prisma.category.create({
      data: {
        name: { en: data.name.en, ar: data.name.ar },
        ...(data.description
          ? {
              description: {
                en: data.description.en,
                ar: data.description.ar,
              },
            }
          : {}),
      },
    });

    return this.toDashboardResponseDto(category);
  }

  async findAll(): Promise<CategoryDashboardResponseDto[]> {
    const categories = await this.prisma.category.findMany();
    return categories.map((category) => this.toDashboardResponseDto(category));
  }

  async findAllLocalized(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany();
    return categories.map((category) => this.toResponseDto(category));
  }

  async findOne(id: string): Promise<CategoryDashboardResponseDto> {
    const category = await this.getById(id);
    return this.toDashboardResponseDto(category);
  }

  async findOneLocalized(id: string): Promise<CategoryResponseDto> {
    const category = await this.getById(id);
    return this.toResponseDto(category);
  }

  private async getById(id: string): Promise<CategoryRecord> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('errors.category_not_found');
    }
    return category;
  }

  async update(
    id: string,
    data: UpdateCategoryDto,
  ): Promise<CategoryDashboardResponseDto> {
    await this.getById(id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name ? { name: { en: data.name.en, ar: data.name.ar } } : {}),
        ...(data.description
          ? {
              description: {
                en: data.description.en,
                ar: data.description.ar,
              },
            }
          : {}),
      },
    });

    return this.toDashboardResponseDto(category);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        'errors.cannot_delete_category_with_products',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'success.category_deleted' };
  }

  private toResponseDto(category: CategoryRecord): CategoryResponseDto {
    return {
      ...category,
      name: resolveLocalizedText(category.name),
      description:
        category.description === null
          ? null
          : resolveLocalizedText(category.description),
    };
  }

  private toDashboardResponseDto(
    category: CategoryRecord,
  ): CategoryDashboardResponseDto {
    return {
      ...category,
      name: parseLocalizedText(category.name),
      description:
        category.description === null
          ? null
          : parseLocalizedText(category.description),
    };
  }
}
