import {
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  ParseBoolPipe,
  ParseUUIDPipe,
} from '@nestjs/common';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';
import { CartsService } from './carts.service';
import { CreateCartDto, UpdateCartDto, ValidateCartDto } from './dto';

@AppController('carts')
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
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
  ) {
    return this.cartsService.findOne(includeItems, branchId);
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
