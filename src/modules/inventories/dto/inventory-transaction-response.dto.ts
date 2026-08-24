import { InventoryTransactionType } from '@generated/prisma/enums';

export class InventoryTransactionResponseDto {
  id: string;
  quantityDelta: number;
  type: InventoryTransactionType;
  note: string | null;
  productId: string;
  branchId: string;
  orderId: string | null;
  createdAt: Date;
}
