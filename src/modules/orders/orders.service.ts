import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma, OrderStatus } from '@generated/prisma/client';
import {
  assertCheckoutFulfillment,
  assertUserOwnsCartOrOrder,
  assessCartItems,
  calculateCartSummary,
} from '@/utils/cart-order-flow';
import {
  ChangeStatusDto,
  CreateOrderDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto';
import { assertAllowedStatusTransition } from './utils/order-status.util';
import { LOYALTY_EARN_RATE } from '@/modules/loyalty-transactions/loyalty-earn.constants';
import { LoyaltyTransactionsService } from '@/modules/loyalty-transactions/loyalty-transactions.service';
import { InventoriesService } from '@/modules/inventories/inventories.service';

import { serializeMoney, toDecimal } from '@/utils/money.util';

import { REQUEST } from '@nestjs/core';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';

@Injectable({ scope: Scope.REQUEST })
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyaltyTransactionsService: LoyaltyTransactionsService,
    private readonly inventoriesService: InventoriesService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  // ============ CUSTOMER METHODS ============

  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const loyaltyPoints = createOrderDto.loyaltyPointsAmount ?? 0;

    const order = await this.prisma.$transaction(async (tx) => {
      const lockedCarts = await tx.$queryRaw<
        Array<{ id: string; userId: string }>
      >`
        SELECT id, "userId" FROM "Cart"
        WHERE "userId" = ${this.userId}
        FOR UPDATE
      `;

      if (lockedCarts.length === 0) {
        throw new NotFoundException('Cart not found');
      }

      const cartId = lockedCarts[0].id;
      assertUserOwnsCartOrOrder(this.userId, lockedCarts[0].userId);

      await tx.$queryRaw`
        SELECT id FROM "CartItem" WHERE "cartId" = ${cartId} FOR UPDATE
      `;

      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: { cartItems: { include: { product: true } } },
      });
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      const cartItems = cart.cartItems;
      const stockByProductId =
        await this.inventoriesService.getQuantitiesByProductId(
          createOrderDto.branchId,
          cartItems.map((item) => item.productId),
          tx,
        );
      const assessment = assessCartItems(cartItems, stockByProductId);
      if (!assessment.valid) {
        throw new BadRequestException({
          message: 'Cart has invalid items',
          issues: assessment.issues,
        });
      }
      const baseSummary = calculateCartSummary(cartItems);

      const { coupon } = await assertCheckoutFulfillment(
        tx,
        {
          userId: this.userId,
          type: createOrderDto.type,
          branchId: createOrderDto.branchId,
          addressId: createOrderDto.addressId,
          couponCode: createOrderDto.couponCode,
        },
        baseSummary.subtotal,
        'order',
      );

      const summary = calculateCartSummary(cartItems, coupon);

      const addressDto = await this.extractAddressData(
        tx,
        createOrderDto.addressId,
      );

      const branchData = await this.extractBranchData(
        tx,
        createOrderDto.branchId,
      );

      const orderCreateData: Prisma.OrderCreateInput = {
        total: toDecimal(summary.total),
        discount: toDecimal(summary.discount),
        tax: toDecimal(summary.tax),
        subtotal: toDecimal(summary.subtotal),

        type: createOrderDto.type,

        paymentMethod: createOrderDto.paymentMethod,

        coupon: coupon ? { connect: { code: coupon.code } } : undefined,
        couponCode: createOrderDto.couponCode,
        couponType: coupon?.type,
        couponValue: coupon?.value,

        loyaltyPointsAmount: loyaltyPoints > 0 ? loyaltyPoints : undefined,

        addressLine1: addressDto?.line1,
        addressLine2: addressDto?.line2,
        city: addressDto?.city,
        state: addressDto?.state,
        zip: addressDto?.zip,
        country: addressDto?.country,
        latitude: addressDto?.latitude,
        longitude: addressDto?.longitude,
        address: createOrderDto.addressId
          ? { connect: { id: createOrderDto.addressId } }
          : undefined,

        branch: { connect: { id: createOrderDto.branchId } },
        branchName: branchData.name,
        branchLocation: branchData.location,

        user: { connect: { id: this.userId } },
      };
      const created = await tx.order.create({
        data: orderCreateData,
      });

      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          // After valid assessment, product + price are present; ?? is for TS
          unitPrice: toDecimal(item.product?.price ?? 0),
        })),
      });

      await this.inventoriesService.decrementForOrderInTx(tx, {
        orderId: created.id,
        branchId: createOrderDto.branchId,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      if (loyaltyPoints > 0) {
        await this.loyaltyTransactionsService.redeemInTx(tx, {
          userId: this.userId,
          points: loyaltyPoints,
          orderId: created.id,
          note: 'Redeemed at order checkout',
        });
      }

      // Disposable cart; next shop recreates via find-or-create
      await tx.cart.delete({ where: { id: cartId } });

      return created;
    });

    return this.findOne(order.id);
  }

  async findAll(): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId: this.userId },
      include: { orderItems: true, address: true, branch: true },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id, userId: this.userId },
      include: { orderItems: true, address: true, branch: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toResponseDto(order);
  }

  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
  ): Promise<OrderResponseDto> {
    const { status } = changeStatusDto;

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === status) {
        return tx.order.findUniqueOrThrow({
          where: { id },
          include: { orderItems: true, address: true, branch: true },
        });
      }

      assertAllowedStatusTransition(order.status, status);

      const next = await tx.order.update({
        where: { id },
        data: { status },
        include: { orderItems: true, address: true, branch: true },
      });

      if (status === OrderStatus.COMPLETED) {
        const earnPoints = Math.floor(Number(order.total)) * LOYALTY_EARN_RATE;
        await this.loyaltyTransactionsService.earnInTx(tx, {
          userId: order.userId,
          points: earnPoints,
          orderId: id,
          note: 'Earned on order completion',
        });
      }

      if (status === OrderStatus.CANCELLED) {
        await this.inventoriesService.restoreForOrderInTx(tx, {
          orderId: id,
          branchId: order.branchId,
        });
        await this.loyaltyTransactionsService.refundRedeemInTx(tx, {
          userId: order.userId,
          orderId: id,
        });
      }

      return next;
    });

    return this.toResponseDto(updated);
  }

  async cancel(id: string): Promise<OrderResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId: this.userId },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      assertAllowedStatusTransition(order.status, OrderStatus.CANCELLED);

      const next = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { orderItems: true, address: true, branch: true },
      });

      await this.inventoriesService.restoreForOrderInTx(tx, {
        orderId: id,
        branchId: order.branchId,
      });
      await this.loyaltyTransactionsService.refundRedeemInTx(tx, {
        userId: this.userId,
        orderId: id,
      });

      return next;
    });

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId: this.userId },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Cannot delete order with status ${order.status}; only PENDING orders can be deleted`,
        );
      }

      await this.inventoriesService.restoreForOrderInTx(tx, {
        orderId: id,
        branchId: order.branchId,
      });
      await this.loyaltyTransactionsService.refundRedeemInTx(tx, {
        userId: this.userId,
        orderId: id,
      });

      await tx.order.delete({
        where: { id, userId: this.userId, status: OrderStatus.PENDING },
      });
      return { message: 'Order deleted successfully' };
    });
  }

  // ============ DASHBOARD METHODS ============

  async findAllForDashboard(): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      include: { orderItems: true, address: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  async findOneForDashboard(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true, address: true, branch: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toResponseDto(order);
  }

  // ============ PRIVATE METHODS ============

  private toResponseDto(
    order: Prisma.OrderGetPayload<{
      include: { orderItems: true; address: true; branch: true };
    }>,
  ): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      userId: order.userId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      couponCode: order.couponCode ?? undefined,
      loyaltyPointsAmount:
        order.loyaltyPointsAmount != null
          ? serializeMoney(order.loyaltyPointsAmount)
          : undefined,
      addressLine1: order.addressLine1 ?? undefined,
      addressLine2: order.addressLine2 ?? undefined,
      city: order.city ?? undefined,
      state: order.state ?? undefined,
      zip: order.zip ?? undefined,
      country: order.country ?? undefined,
      latitude: order.latitude ?? undefined,
      longitude: order.longitude ?? undefined,
      paymentMethod: order.paymentMethod,
      total: serializeMoney(order.total),
      discount: serializeMoney(order.discount),
      tax: serializeMoney(order.tax),
      subtotal: serializeMoney(order.subtotal),
      orderItems: order.orderItems.map((item) => this.toOrderItemDto(item)),
      type: order.type,
      address: order.address ?? undefined,
      branch: order.branch,
    };
  }

  private toOrderItemDto(
    item: Prisma.OrderItemGetPayload<object>,
  ): OrderItemResponseDto {
    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice: serializeMoney(item.unitPrice),
      orderId: item.orderId,
      productId: item.productId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async extractAddressData(
    tx: Prisma.TransactionClient,
    addressId: string | undefined,
  ) {
    if (!addressId) {
      return undefined;
    }

    const address = await tx.address.findUnique({
      where: { id: addressId, userId: this.userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  private async extractBranchData(
    tx: Prisma.TransactionClient,
    branchId: string,
  ) {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      name: branch.name,
      location: branch.location,
    };
  }
}
