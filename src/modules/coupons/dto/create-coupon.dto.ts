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

const moneyPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(moneyPattern, {
    message:
      'value must be a non-negative decimal string with up to 10 digits and 2 decimal places',
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
  @Matches(moneyPattern, {
    message:
      'minOrderAmount must be a non-negative decimal string with up to 10 digits and 2 decimal places',
  })
  minOrderAmount: string;

  @IsString()
  @IsNotEmpty()
  @Matches(moneyPattern, {
    message:
      'maxDiscountAmount must be a non-negative decimal string with up to 10 digits and 2 decimal places',
  })
  maxDiscountAmount: string;

  @IsInt()
  @Min(1)
  usageLimit: number;
}
