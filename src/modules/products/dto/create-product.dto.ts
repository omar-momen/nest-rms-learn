import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  Matches,
} from 'class-validator';

import { MONEY_STRING_MESSAGE, MONEY_STRING_PATTERN } from '@/utils/money.util';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(MONEY_STRING_PATTERN, {
    message: MONEY_STRING_MESSAGE,
  })
  price: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
