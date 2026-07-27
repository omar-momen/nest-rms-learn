import { IsEnum, IsOptional } from 'class-validator';

import { OrderStatus } from '@generated/prisma/client';

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
