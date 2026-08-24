import { Prisma } from '@generated/prisma/client';

export type MoneyInput = Prisma.Decimal | number | string;

// Convert any input from the client to a Decimal before storing in the database
export function toDecimal(value: MoneyInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

// Convert a Decimal to a string with 2 decimal places for display
export function serializeMoney(value: MoneyInput): string {
  return toDecimal(value).toFixed(2);
}

export function multiplyMoney(
  unitPrice: MoneyInput,
  quantity: number,
): Prisma.Decimal {
  return toDecimal(unitPrice).mul(quantity);
}

export function sumMoney(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((acc, value) => acc.add(value), new Prisma.Decimal(0));
}

// a > b: 1, a < b: -1, a = b: 0
export function compareMoney(a: MoneyInput, b: MoneyInput): number {
  return toDecimal(a).comparedTo(toDecimal(b));
}

// a > b: true, a < b: false, a = b: false
export function isGreaterThanMoney(a: MoneyInput, b: MoneyInput): boolean {
  return compareMoney(a, b) > 0;
}

// a >= b: true, a < b: false, a = b: true
export function isGreaterThanOrEqualToMoney(
  a: MoneyInput,
  b: MoneyInput,
): boolean {
  return compareMoney(a, b) >= 0;
}

// a < b: true, a >= b: false, a = b: false
export function isLessThanMoney(a: MoneyInput, b: MoneyInput): boolean {
  return compareMoney(a, b) < 0;
}

// a <= b: true, a > b: false, a = b: true
export function isLessThanOrEqualToMoney(
  a: MoneyInput,
  b: MoneyInput,
): boolean {
  return compareMoney(a, b) <= 0;
}
