# Overview

## Layout

```
src/
  main.ts                 # bootstrap + ValidationPipe
  app.module.ts           # root imports
  config/                 # env config + Joi validation
  constants/              # shared constants (e.g. DEV_CURRENT_USER_ID)
  utils/                  # shared helpers (money.util)
  prisma/                 # PrismaModule (global) + PrismaService
  modules/
    categories/           # basic CRUD (reference)
    products/             # CRUD + CategoriesService
    users/                # CRUD; maps to UserResponseDto (no password)
    carts/                # aggregate: find-or-create, replace items, assess/validate
    orders/               # checkout from cart; status transitions
prisma/                   # schema + migrations
generated/prisma/         # Prisma client output
```

## Request flow

```
HTTP → Controller → Service → PrismaService → Postgres
                ↘ (optional) other feature Service
```

Cross-module examples:
- `ProductsService` → `CategoriesService` (category must exist)
- `CartsService` → `ProductsService` (availability on replace)
- `OrdersService` uses Prisma + cart utils (ownership / assess) for checkout

## Current domains

| Module | Route prefix | Notes |
|--------|--------------|-------|
| Categories | `/categories` | Basic CRUD |
| Products | `/products` | CRUD; soft-remove sets `isAvailable: false` |
| Users | `/users` | CRUD; cannot delete if cart/orders exist |
| Carts | `/carts` | Own line items via Prisma; see [carts.md](carts.md) |
| Orders | `/orders` | Checkout + status; see [orders.md](orders.md) |

Line items (`CartItem`, `OrderItem`) are **not** separate HTTP modules. Carts own cart lines; orders create order lines at checkout.

## Domain relations

```
User 1──1 Cart 1──* CartItem *──1 Product *──1 Category
User 1──* Order 1──* OrderItem *──1 Product
```

- `CartItem` unique on `(cartId, productId)`
- `OrderItem` unique on `(orderId, productId)`
- Deleting a cart/order cascades to its items
- Money fields are `Decimal` in DB; API responses use fixed 2-decimal **strings** (`src/utils/money.util.ts`)
