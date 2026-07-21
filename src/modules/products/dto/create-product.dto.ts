import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
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

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;
}
