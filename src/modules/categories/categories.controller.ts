import { Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { CategoriesService } from './categories.service';

@AppController('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }
}
