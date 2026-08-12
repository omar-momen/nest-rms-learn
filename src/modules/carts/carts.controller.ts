import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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

  @Post('validate')
  validateCart(@Body() validateCartDto: ValidateCartDto) {
    return this.cartsService.validateCart(validateCartDto);
  }

  @Get()
  findOne(
    @Query('includeItems', new ParseBoolPipe({ optional: true }))
    includeItems: boolean = false,
  ) {
    return this.cartsService.findOne(includeItems);
  }

  @Patch()
  update(@Body() updateCartDto: UpdateCartDto) {
    return this.cartsService.update(updateCartDto);
  }

  @Delete()
  remove() {
    return this.cartsService.remove();
  }
}
