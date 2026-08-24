import {
  Body,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { DashboardController } from '@/modules/auth/decorators/dashboard-controller.decorator';
import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@DashboardController('categories')
export class CategoriesDashboardController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.CATEGORIES_WRITE)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CATEGORIES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CATEGORIES_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
