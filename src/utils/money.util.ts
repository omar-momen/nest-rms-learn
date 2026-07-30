import { Prisma } from '@generated/prisma/client';

export function toDecimal(
  value: Prisma.Decimal | number | string,
): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function serializeMoney(
  value: Prisma.Decimal | number | string,
): string {
  return toDecimal(value).toFixed(2);
}

export function multiplyMoney(
  unitPrice: Prisma.Decimal | number | string,
  quantity: number,
): Prisma.Decimal {
  return toDecimal(unitPrice).mul(quantity);
}

export function sumMoney(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((acc, value) => acc.add(value), new Prisma.Decimal(0));
}
