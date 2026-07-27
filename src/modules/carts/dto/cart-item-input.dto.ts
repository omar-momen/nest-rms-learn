import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CartItemInputDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
