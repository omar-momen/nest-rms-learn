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
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, {
    message:
      'price must be a non-negative decimal string with up to 10 digits and 2 decimal places',
  })
  price: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
