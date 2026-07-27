import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';

import { CreateOrderItemDto, OrderItemResponseDto } from './dto';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateOrderItemDto): Promise<OrderItemResponseDto> {
    return this.prisma.orderItem.create({ data });
  }

  findAll(): Promise<OrderItemResponseDto[]> {
    return this.prisma.orderItem.findMany();
  }

  async findOne(id: string): Promise<OrderItemResponseDto> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id },
    });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }
    return orderItem;
  }

  async update(
    id: string,
    data: Prisma.OrderItemUpdateInput,
  ): Promise<OrderItemResponseDto> {
    await this.findOne(id);
    return this.prisma.orderItem.update({ where: { id }, data });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.orderItem.delete({ where: { id } });
    return { message: 'Order item deleted successfully' };
  }
}
