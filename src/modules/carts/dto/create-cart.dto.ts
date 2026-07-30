import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CartItemInputDto } from './cart-item-input.dto';

export class CreateCartDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items?: CartItemInputDto[];
}
