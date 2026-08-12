import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrderType, PrismaClient } from '@generated/prisma/client';
import type { Prisma } from '@generated/prisma/client';

type CheckoutDb = Pick<
  PrismaClient | Prisma.TransactionClient,
  'branch' | 'address'
>;

export async function assertBranchAvailable(
  db: CheckoutDb,
  branchId: string,
): Promise<void> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  // if (branch.closed) {
  //   throw new BadRequestException('Branch is closed');
  // }
  // if (branch.busy) {
  //   throw new BadRequestException('Branch is busy');
  // }
}

export async function assertUserAddressForDelivery(
  db: CheckoutDb,
  userId: string,
  addressId: string | undefined,
  branchId: string,
): Promise<void> {
  if (!addressId) {
    throw new BadRequestException('Address ID is required for delivery');
  }

  const address = await db.address.findUnique({
    where: { id: addressId, userId },
  });

  if (!address) {
    throw new NotFoundException('Address not found');
  }

  const branch = await db.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  // TODO: check if the address is in the branch's service area
}

export async function assertCheckoutFulfillment(
  db: CheckoutDb,
  input: {
    userId: string;
    type: OrderType;
    branchId: string;
    addressId?: string;
  },
): Promise<void> {
  await assertBranchAvailable(db, input.branchId);

  if (input.type === OrderType.DELIVERY) {
    await assertUserAddressForDelivery(
      db,
      input.userId,
      input.addressId,
      input.branchId,
    );
    return;
  }

  if (input.addressId) {
    throw new BadRequestException(
      'Address ID is only allowed for delivery orders',
    );
  }
}
