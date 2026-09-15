import { Get, Param } from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { ParseUuidPipe } from '@/common/pipes';

import { CategoriesService } from './categories.service';

@AppController('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  findAll() {
    return this.categoriesService.findAllLocalized();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.categoriesService.findOneLocalized(id);
  }
}
