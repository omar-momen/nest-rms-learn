# Overview

## Layout

```
src/
  main.ts                 # bootstrap + ValidationPipe
  app.module.ts           # root imports
  config/                 # env config + Joi validation
  prisma/                 # PrismaModule (global) + PrismaService
  modules/
    categories/           # feature module (reference)
    products/             # feature module (reference)
    users/
    carts/                # aggregate: find-or-create, replace items, validate
    cart-items/           # line items; used by carts + own CRUD routes
prisma/                   # schema + migrations
generated/prisma/         # Prisma client output
```

## Request flow

```
HTTP → Controller → Service → PrismaService → Postgres
                ↘ (optional) other feature Service
```

Carts also compose other services: `CartsService` → `CartItemsService` + `ProductsService`.

## Current domains

| Module | Route prefix | Notes |
|--------|--------------|-------|
| Categories | `/categories` | CRUD; exports service |
| Products | `/products` | CRUD; checks category exists via `CategoriesService` |
| Users | `/users` | CRUD; one optional cart per user |
| Carts | `/carts` | Find-or-create, replace items, soft assess / hard validate — see [carts.md](carts.md) |
| Cart items | `/cart-items` | Line-item CRUD; helpers used by carts |

## Domain relations

```
User 1──1 Cart 1──* CartItem *──1 Product *──1 Category
```

`CartItem` is unique on `(cartId, productId)`. Deleting a cart cascades to its items.
