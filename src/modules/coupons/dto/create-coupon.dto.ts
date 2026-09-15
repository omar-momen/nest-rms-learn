import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

import { CouponType } from '@generated/prisma/enums';
import { MONEY_STRING_MESSAGE, MONEY_STRING_PATTERN } from '@/utils/money.util';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(MONEY_STRING_PATTERN, {
    message: MONEY_STRING_MESSAGE,
  })
  value: string;

  @IsEnum(CouponType)
  @IsNotEmpty()
  type: CouponType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsDateString()
  startDate: string;

  @IsDateString()
  expireDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(MONEY_STRING_PATTERN, {
    message: MONEY_STRING_MESSAGE,
  })
  minOrderAmount: string;

  @IsString()
  @IsNotEmpty()
  @Matches(MONEY_STRING_PATTERN, {
    message: MONEY_STRING_MESSAGE,
  })
  maxDiscountAmount: string;

  @IsInt()
  @Min(1)
  usageLimit: number;
}
