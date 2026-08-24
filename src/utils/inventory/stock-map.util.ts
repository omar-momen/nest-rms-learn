/**
 * Missing inventory rows mean 0 available — never undefined in callers.
 */
export function toQuantityByProductId(
  productIds: string[],
  rows: Array<{ productId: string; quantity: number }>,
): Map<string, number> {
  const stock = new Map<string, number>();

  for (const id of productIds) {
    stock.set(id, 0);
  }
  for (const row of rows) {
    stock.set(row.productId, row.quantity);
  }

  return stock;
}
