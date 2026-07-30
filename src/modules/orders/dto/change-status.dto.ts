import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@generated/prisma/client';

export class ChangeStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
