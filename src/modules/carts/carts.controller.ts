import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';

import { CartsService } from './carts.service';
import { CreateCartDto, UpdateCartDto, ValidateCartDto } from './dto';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  create(@Body() createCartDto: CreateCartDto) {
    return this.cartsService.create(createCartDto);
  }

  @Post(':id/validate')
  validateCart(
    @Param('id') id: string,
    @Body() validateCartDto?: ValidateCartDto,
  ) {
    return this.cartsService.validateCart(id, validateCartDto);
  }

  @Get()
  findAll() {
    return this.cartsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('includeItems', new ParseBoolPipe({ optional: true }))
    includeItems: boolean = false,
  ) {
    return this.cartsService.findOne(id, includeItems);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartsService.update(id, updateCartDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cartsService.remove(id);
  }
}
