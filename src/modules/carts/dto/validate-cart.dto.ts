import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ValidateCartDto {
  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsNumber()
  @IsOptional()
  loyaltyPointsAmount?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
