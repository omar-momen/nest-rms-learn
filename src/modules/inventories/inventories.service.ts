import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';
import { InventoryTransactionType } from '@generated/prisma/enums';
import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  mergeAndSortInventoryLines,
  signedDelta,
  toQuantityByProductId,
  type LedgerDirection,
} from '@/utils/inventory';

import {
  AdjustInventoryDto,
  InventoryResponseDto,
  InventoryTransactionResponseDto,
} from './dto';

type ApplyDeltaInput = {
  productId: string;
  branchId: string;
  quantityDelta: number;
  type: InventoryTransactionType;
  orderId?: string;
  note?: string;
};

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InventoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(data: AdjustInventoryDto): Promise<InventoryResponseDto> {
    await this.assertProductAndBranchExist(data.productId, data.branchId);

    const quantityDelta = signedDelta(
      data.quantity,
      this.directionForAdjust(data),
    );

    return this.prisma.$transaction((tx) =>
      this.applyDeltaInTx(tx, {
        productId: data.productId,
        branchId: data.branchId,
        quantityDelta,
        type: data.type,
        note: data.note,
      }),
    );
  }

  findAll(
    branchId?: string,
    productId?: string,
  ): Promise<InventoryResponseDto[]> {
    return this.prisma.productInventory.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(productId ? { productId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<InventoryResponseDto> {
    const row = await this.prisma.productInventory.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Inventory not found');
    }
    return row;
  }

  findAllTransactions(filters: {
    branchId?: string;
    productId?: string;
    orderId?: string;
  }): Promise<InventoryTransactionResponseDto[]> {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.orderId ? { orderId: filters.orderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTransaction(
    id: string,
  ): Promise<InventoryTransactionResponseDto> {
    const row = await this.prisma.inventoryTransaction.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Inventory transaction not found');
    }
    return row;
  }

  async getQuantitiesByProductId(
    branchId: string,
    productIds: string[],
    client: DbClient = this.prisma,
  ): Promise<Map<string, number>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const rows = await client.productInventory.findMany({
      where: { branchId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });

    return toQuantityByProductId(productIds, rows);
  }

  async decrementForOrderInTx(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      branchId: string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ): Promise<void> {
    const items = mergeAndSortInventoryLines(input.items);

    if (items.length === 0) {
      return;
    }

    await this.lockInventoryRows(
      tx,
      input.branchId,
      items.map((item) => item.productId),
    );

    for (const item of items) {
      await this.applyDeltaInTx(tx, {
        productId: item.productId,
        branchId: input.branchId,
        quantityDelta: signedDelta(item.quantity, 'DEBIT'),
        type: InventoryTransactionType.ORDER_DECREMENT,
        orderId: input.orderId,
        note: 'Decremented at order checkout',
      });
    }
  }

  async restoreForOrderInTx(
    tx: Prisma.TransactionClient,
    input: { orderId: string; branchId: string },
  ): Promise<void> {
    const decrements = await tx.inventoryTransaction.findMany({
      where: {
        orderId: input.orderId,
        type: InventoryTransactionType.ORDER_DECREMENT,
      },
      orderBy: { productId: 'asc' },
    });
    if (decrements.length === 0) {
      return;
    }

    const existingRestore = await tx.inventoryTransaction.findFirst({
      where: {
        orderId: input.orderId,
        type: InventoryTransactionType.ORDER_RESTORE,
      },
      select: { id: true },
    });
    if (existingRestore) {
      return;
    }

    await this.lockInventoryRows(
      tx,
      input.branchId,
      decrements.map((row) => row.productId),
    );

    for (const decrement of decrements) {
      await this.applyDeltaInTx(tx, {
        productId: decrement.productId,
        branchId: input.branchId,
        quantityDelta: signedDelta(Math.abs(decrement.quantityDelta), 'CREDIT'),
        type: InventoryTransactionType.ORDER_RESTORE,
        orderId: input.orderId,
        note: 'Restored for cancelled/deleted order',
      });
    }
  }

  // ====================== PRIVATE METHODS ======================

  private directionForAdjust(data: AdjustInventoryDto): LedgerDirection {
    if (data.type === InventoryTransactionType.RESTOCK) {
      return 'CREDIT';
    }

    if (data.direction !== 'CREDIT' && data.direction !== 'DEBIT') {
      throw new BadRequestException(
        'direction is required for ADJUST (CREDIT or DEBIT)',
      );
    }

    return data.direction;
  }

  private async applyDeltaInTx(
    tx: Prisma.TransactionClient,
    input: ApplyDeltaInput,
  ): Promise<InventoryResponseDto> {
    if (input.quantityDelta === 0) {
      throw new BadRequestException(
        'Inventory quantity delta must be non-zero',
      );
    }

    await this.lockInventoryRow(tx, input.productId, input.branchId);

    const row = await tx.productInventory.upsert({
      where: {
        productId_branchId: {
          productId: input.productId,
          branchId: input.branchId,
        },
      },
      create: {
        productId: input.productId,
        branchId: input.branchId,
        quantity: 0,
      },
      update: {},
    });

    const nextQuantity = row.quantity + input.quantityDelta;
    if (nextQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock for product ${input.productId}`,
      );
    }

    const updated = await tx.productInventory.update({
      where: { id: row.id },
      data: { quantity: nextQuantity },
    });

    await tx.inventoryTransaction.create({
      data: {
        quantityDelta: input.quantityDelta,
        type: input.type,
        note: input.note,
        productId: input.productId,
        branchId: input.branchId,
        orderId: input.orderId,
      },
    });

    return updated;
  }

  private async assertProductAndBranchExist(
    productId: string,
    branchId: string,
  ): Promise<void> {
    const [product, branch] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      }),
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async lockInventoryRow(
    tx: Prisma.TransactionClient,
    productId: string,
    branchId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT id FROM "ProductInventory"
      WHERE "productId" = ${productId} AND "branchId" = ${branchId}
      FOR UPDATE
    `;
  }

  private async lockInventoryRows(
    tx: Prisma.TransactionClient,
    branchId: string,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    await tx.$queryRaw`
      SELECT id FROM "ProductInventory"
      WHERE "branchId" = ${branchId}
        AND "productId" IN (${Prisma.join(productIds)})
      ORDER BY "productId"
      FOR UPDATE
    `;
  }
}
