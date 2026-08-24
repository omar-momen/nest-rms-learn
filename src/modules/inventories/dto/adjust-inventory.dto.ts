import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { InventoryTransactionType } from '@generated/prisma/enums';

export class AdjustInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  /** Absolute quantity; sign comes from `type` (ADJUST uses `direction`). */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsIn([InventoryTransactionType.RESTOCK, InventoryTransactionType.ADJUST])
  type: InventoryTransactionType;

  /** Required when `type` is `ADJUST`: credit adds stock, debit subtracts. */
  @IsOptional()
  @IsIn(['CREDIT', 'DEBIT'])
  direction?: 'CREDIT' | 'DEBIT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
