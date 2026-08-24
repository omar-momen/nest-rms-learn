import { BadRequestException } from '@nestjs/common';

export type InventoryLine = { productId: string; quantity: number };

/**
 * Collapse duplicate productIds and sort so row locks are always acquired
 * in the same order (avoids deadlocks under concurrent checkouts).
 */
export function mergeAndSortInventoryLines(
  items: InventoryLine[],
): InventoryLine[] {
  const byProduct = new Map<string, number>();

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new BadRequestException(
        'Quantity must be an integer of at least 1',
      );
    }
    byProduct.set(
      item.productId,
      (byProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }

  return [...byProduct.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}
