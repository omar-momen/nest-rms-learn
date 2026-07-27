import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';

import { CartsService } from '@/modules/carts/carts.service';
import { OrderItemsService } from '@/modules/order-items/order-items.service';

import { CreateOrderDto, OrderResponseDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartsService: CartsService,
    private readonly orderItemsService: OrderItemsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    // TODO: Make this as a transaction

    const userId = '7c78714d-d603-4a57-bdfa-8fd4946a0408'; // TODO: Resolve user from current JWT
    const cartId = '340f2c3b-97de-4426-aeec-87433c1b79c7'; // TODO: Resolve cart from current user

    // Validate The Order
    const validatedCart = await this.cartsService.validateCart(cartId, {
      couponCode: createOrderDto.couponCode,
      loyaltyPointsAmount: createOrderDto.loyaltyPointsAmount,
    });

    // Create The Order
    const order = await this.prisma.order.create({
      data: {
        user: { connect: { id: userId } },
        couponCode: createOrderDto.couponCode,
        loyaltyPointsAmount: createOrderDto.loyaltyPointsAmount,
        address: createOrderDto.address,
        paymentMethod: createOrderDto.paymentMethod,
        total: validatedCart.summary?.total ?? 0,
        discount: validatedCart.summary?.discount ?? 0,
        tax: validatedCart.summary?.tax ?? 0,
        subtotal: validatedCart.summary?.subtotal ?? 0,
      },
    });

    // Create The Order Items
    for (const item of validatedCart.cartItems ?? []) {
      await this.orderItemsService.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: +(item.product?.price ?? 0),
      });
    }

    // Delete disposable cart; next shop recreates via find-or-create
    await this.cartsService.remove(cartId);

    // return the order
    return this.findOne(order.id);
  }

  async findAll(): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      include: {
        orderItems: true,
      },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.toResponseDto(order);
  }

  async update(
    id: string,
    data: Prisma.OrderUpdateInput,
  ): Promise<OrderResponseDto> {
    await this.findOne(id);
    await this.prisma.order.update({ where: { id }, data });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.order.delete({ where: { id } });
    return { message: 'Order deleted successfully' };
  }

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
      loyaltyPointsAmount: order.loyaltyPointsAmount?.toNumber(),
      address: order.address ?? undefined,
      paymentMethod: order.paymentMethod ?? undefined,
      total: order.total.toNumber(),
      discount: order.discount.toNumber(),
      tax: order.tax.toNumber(),
      subtotal: order.subtotal.toNumber(),
      orderItems: order.orderItems,
    };
  }
}
