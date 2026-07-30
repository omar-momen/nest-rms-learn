import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, OrderStatus } from '@generated/prisma/client';
import { DEV_CURRENT_USER_ID } from '@/constants/dev-current-user';
import { CartsService } from '@/modules/carts/carts.service';

import { CreateOrderDto, OrderResponseDto, OrderItemResponseDto } from './dto';
import {
  assertAllowedStatusTransition,
  assertOrderDeletable,
} from './utils/order-status.util';
import { assertUserOwnsCartOrOrder } from '@/modules/carts/utils/cart-ownership.util';

import { serializeMoney, toDecimal } from '@/utils/money.util';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartsService: CartsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const userId = DEV_CURRENT_USER_ID;

    const order = await this.prisma.$transaction(async (tx) => {
      const lockedCarts = await tx.$queryRaw<
        Array<{ id: string; userId: string }>
      >`
        SELECT id, "userId" FROM "Cart"
        WHERE "userId" = ${userId}::uuid
        FOR UPDATE
      `;

      if (lockedCarts.length === 0) {
        throw new NotFoundException('Cart not found');
      }

      const cartId = lockedCarts[0].id;
      assertUserOwnsCartOrOrder(userId, lockedCarts[0].userId);

      await tx.$queryRaw`
        SELECT id FROM "CartItem" WHERE "cartId" = ${cartId}::uuid FOR UPDATE
      `;

      const cart = await this.cartsService.findOne(cartId, true);

      if (!cart.valid || !cart.summary) {
        throw new BadRequestException({
          message: 'Cart has invalid items',
          issues: cart.issues,
        });
      }

      // TODO: apply coupon / loyalty / address / payment; compute discount & tax
      // summary already computed by CartsService.findOne(..., true)
      const { summary } = cart;
      const cartItems = cart.cartItems ?? [];

      const created = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          couponCode: createOrderDto.couponCode,
          loyaltyPointsAmount: createOrderDto.loyaltyPointsAmount,
          address: createOrderDto.address,
          paymentMethod: createOrderDto.paymentMethod,
          total: toDecimal(summary.total),
          discount: toDecimal(summary.discount),
          tax: toDecimal(summary.tax),
          subtotal: toDecimal(summary.subtotal),
        },
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
      where: { userId: DEV_CURRENT_USER_ID },
      include: { orderItems: true },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    assertUserOwnsCartOrOrder(DEV_CURRENT_USER_ID, order.userId);

    return this.toResponseDto(order);
  }

  async changeStatus(
    id: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const order = await this.findOne(id);

    assertAllowedStatusTransition(order.status, status);

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { orderItems: true },
    });

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const order = await this.findOne(id);
    assertOrderDeletable(order.status);

    await this.prisma.order.delete({ where: { id } });
    return { message: 'Order deleted successfully' };
  }

  // ============ PRIVATE METHODS ============

  private toResponseDto(
    order: Prisma.OrderGetPayload<{ include: { orderItems: true } }>,
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
      address: order.address ?? undefined,
      paymentMethod: order.paymentMethod ?? undefined,
      total: serializeMoney(order.total),
      discount: serializeMoney(order.discount),
      tax: serializeMoney(order.tax),
      subtotal: serializeMoney(order.subtotal),
      orderItems: order.orderItems.map((item) => this.toOrderItemDto(item)),
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
}
