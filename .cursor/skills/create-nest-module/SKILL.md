---
name: create-nest-module
description: >-
  Scaffolds a NestJS feature module matching project conventions (plural naming,
  DTOs, error handling, AppModule registration). Use when the user asks to create
  a new module, resource, CRUD feature, or domain under src/modules.
---

# Create Nest feature module

Follow `docs/guidelines/coding.md` and mirror `src/modules/categories/`.

## Before coding

1. Confirm **plural** resource name (e.g. `orders`, not `order`)
2. Confirm Prisma model exists (or add to `prisma/schema.prisma` first if needed)
3. Note relations to other modules (import + inject exported services)

## Checklist

Copy and track:

```
- [ ] Folder src/modules/<plural>/
- [ ] <plural>.module.ts / .controller.ts / .service.ts
- [ ] dto/ create, update, response + index.ts
- [ ] <plural>.endpoint.http
- [ ] Register in AppModule
- [ ] Export service if another module will use it
- [ ] Optional: *.spec.ts stubs
```

## File templates

Replace `orders` / `Order` / `order` with the real plural / Pascal singular / lower singular.

### Module

```ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // omit if nothing imports it yet
})
export class OrdersModule {}
```

### Controller

```ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
```

### Service (error-handling pattern)

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOrderDto, OrderResponseDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateOrderDto) {
    return this.prisma.order.create({ data });
  }

  findAll(): Promise<OrderResponseDto[]> {
    return this.prisma.order.findMany();
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Order not found');
    return row;
  }

  async update(id: string, data: /* Prisma update input or UpdateOrderDto */) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.order.delete({ where: { id } });
    return { message: 'Order deleted successfully' };
  }
}
```

### DTOs

- `create-order.dto.ts` — `class-validator` on fields
- `update-order.dto.ts` — usually `PartialType(CreateOrderDto)` from `@nestjs/mapped-types`
- `order-response.dto.ts` — plain class with response fields (enhance mapping later)
- `dto/index.ts` — `export *` all three

### Wire-up

1. `AppModule` imports: `OrdersModule`
2. If module A needs B: `imports: [BModule]` and inject `BService`
3. Add a few requests to `orders.endpoint.http`

## Done when

- Builds / types clean against existing aliases
- Matches plural naming and NotFound pattern
- Same shape as `categories` / `products`
