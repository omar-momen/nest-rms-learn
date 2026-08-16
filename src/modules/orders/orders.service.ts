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
import { CreateOrderDto, OrderResponseDto, OrderItemResponseDto } from './dto';
import { assertAllowedStatusTransition } from './utils/order-status.util';

import { serializeMoney, toDecimal } from '@/utils/money.util';

import { REQUEST } from '@nestjs/core';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';

@Injectable({ scope: Scope.REQUEST })
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
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

      const assessment = assessCartItems(cart.cartItems);
      if (!assessment.valid) {
        throw new BadRequestException({
          message: 'Cart has invalid items',
          issues: assessment.issues,
        });
      }

      // TODO: loyalty points / payment; compute tax

      const cartItems = cart.cartItems;
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

        loyaltyPointsAmount: createOrderDto.loyaltyPointsAmount,

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

  // async changeStatus(
  //   id: string,
  //   status: OrderStatus,
  // ): Promise<OrderResponseDto> {
  //   const order = await this.findOne(id);

  //   assertAllowedStatusTransition(order.status, status);

  //   const updated = await this.prisma.order.update({
  //     where: { id },
  //     data: { status },
  //     include: { orderItems: true, address: true, branch: true },
  //   });

  //   return this.toResponseDto(updated);
  // }

  async cancel(id: string): Promise<OrderResponseDto> {
    const order = await this.findOne(id);

    assertAllowedStatusTransition(order.status, OrderStatus.CANCELLED);

    return this.toResponseDto(
      await this.prisma.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { orderItems: true, address: true, branch: true },
      }),
    );
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

      await tx.order.delete({
        where: { id, userId: this.userId, status: OrderStatus.PENDING },
      });
      return { message: 'Order deleted successfully' };
    });
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
