import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { Prisma } from '@generated/prisma/client';
import { LoyaltyTransactionType } from '@generated/prisma/enums';
import { PrismaService } from '@/modules/prisma/prisma.service';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';

import {
  LoyaltyBalanceResponseDto,
  LoyaltyTransactionResponseDto,
} from './dto';

type ApplyDeltaInput = {
  userId: string;
  pointsDelta: number;
  type: LoyaltyTransactionType;
  orderId?: string;
  note?: string;
};

@Injectable({ scope: Scope.REQUEST })
export class LoyaltyTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  findAll(): Promise<LoyaltyTransactionResponseDto[]> {
    return this.prisma.loyaltyTransaction.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<LoyaltyTransactionResponseDto> {
    const row = await this.prisma.loyaltyTransaction.findFirst({
      where: { id, userId: this.userId },
    });
    if (!row) {
      throw new NotFoundException('Loyalty transaction not found');
    }
    return row;
  }

  async getBalance(): Promise<LoyaltyBalanceResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: this.userId },
      select: { loyaltyPointsBalance: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { balance: user.loyaltyPointsBalance };
  }

  async redeemInTx(
    tx: Prisma.TransactionClient,
    input: { userId: string; points: number; orderId: string; note?: string },
  ): Promise<LoyaltyTransactionResponseDto> {
    if (input.points <= 0) {
      throw new BadRequestException('Redeem points must be greater than 0');
    }
    return this.applyDeltaInTx(tx, {
      userId: input.userId,
      pointsDelta: -input.points,
      type: LoyaltyTransactionType.REDEEM,
      orderId: input.orderId,
      note: input.note,
    });
  }

  async refundRedeemInTx(
    tx: Prisma.TransactionClient,
    input: { userId: string; orderId: string },
  ): Promise<LoyaltyTransactionResponseDto | null> {
    const redeem = await tx.loyaltyTransaction.findFirst({
      where: {
        userId: input.userId,
        orderId: input.orderId,
        type: LoyaltyTransactionType.REDEEM,
      },
      orderBy: { createdAt: 'asc' },
    });
    // To prevent refunding points for a non-existent redeem
    if (!redeem) {
      return null;
    }

    const existingRefund = await tx.loyaltyTransaction.findFirst({
      where: {
        userId: input.userId,
        orderId: input.orderId,
        type: LoyaltyTransactionType.ADJUST,
        points: { gt: 0 },
      },
      select: { id: true },
    });
    // To prevent duplicate refunds for the same order
    if (existingRefund) {
      return null;
    }

    const creditPoints = Math.abs(redeem.points);
    return this.applyDeltaInTx(tx, {
      userId: input.userId,
      pointsDelta: creditPoints,
      type: LoyaltyTransactionType.ADJUST,
      orderId: input.orderId,
      note: 'Refund redeemed points for cancelled/deleted order',
    });
  }

  async earnInTx(
    tx: Prisma.TransactionClient,
    input: { userId: string; points: number; orderId: string; note?: string },
  ): Promise<LoyaltyTransactionResponseDto | null> {
    if (input.points <= 0) {
      return null;
    }

    const existingEarn = await tx.loyaltyTransaction.findFirst({
      where: {
        userId: input.userId,
        orderId: input.orderId,
        type: LoyaltyTransactionType.EARN,
      },
      select: { id: true },
    });
    // To prevent duplicate earnings for the same order
    if (existingEarn) {
      return null;
    }

    return this.applyDeltaInTx(tx, {
      userId: input.userId,
      pointsDelta: input.points,
      type: LoyaltyTransactionType.EARN,
      orderId: input.orderId,
      note: input.note,
    });
  }

  private async applyDeltaInTx(
    tx: Prisma.TransactionClient,
    input: ApplyDeltaInput,
  ): Promise<LoyaltyTransactionResponseDto> {
    if (input.pointsDelta === 0) {
      throw new BadRequestException('Loyalty points delta must be non-zero');
    }

    const lockedUsers = await tx.$queryRaw<
      Array<{ id: string; loyaltyPointsBalance: number }>
    >`
      SELECT id, "loyaltyPointsBalance" FROM "User"
      WHERE id = ${input.userId}
      FOR UPDATE
    `;

    if (lockedUsers.length === 0) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = lockedUsers[0].loyaltyPointsBalance;
    const nextBalance = currentBalance + input.pointsDelta;
    if (nextBalance < 0) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { loyaltyPointsBalance: nextBalance },
    });

    return tx.loyaltyTransaction.create({
      data: {
        points: input.pointsDelta,
        type: input.type,
        note: input.note,
        userId: input.userId,
        orderId: input.orderId,
      },
    });
  }
}
