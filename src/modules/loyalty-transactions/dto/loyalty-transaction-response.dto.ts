import { LoyaltyTransactionType } from '@generated/prisma/enums';

export class LoyaltyTransactionResponseDto {
  id: string;
  points: number;
  type: LoyaltyTransactionType;
  note: string | null;
  userId: string;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
