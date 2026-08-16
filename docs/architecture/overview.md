# Overview

## Layout

```
src/
  main.ts                 # bootstrap + ValidationPipe + cookie-parser
  app.module.ts           # root imports + global JwtModule + ThrottlerModule / ThrottlerGuard + APP_FILTER + APP_INTERCEPTOR
  config/                 # env config + Joi validation
  common/
    throttler/            # default + authEmail throttler options
    filters/              # AllExceptionsFilter (unified body) + PrismaExceptionFilter (P2002→409, etc.)
    interceptors/         # DataResponseInterceptor (wraps success payloads)
    responses/            # DataResponseBody + ErrorResponseBody
  utils/                  # shared helpers (money, password, token, duration)
  modules/
    prisma/               # PrismaModule (global) + PrismaService
    auth/                 # register/login/refresh/logout + AccessTokenGuard
    categories/           # basic CRUD (reference)
    products/             # CRUD + CategoriesService
    users/                # /users/me; password hashing + guarded deletion
    addresses/            # user-scoped saved addresses
    branches/             # restaurant locations for fulfillment
    carts/                # aggregate: find-or-create, replace items, assess/validate
    orders/               # checkout from cart; cancel; status rules in util
prisma/                   # schema + migrations
generated/prisma/         # Prisma client output
```

## Request flow

```
HTTP
  → cookie-parser
  → ThrottlerGuard          (default IP limit; auth routes tighten further)
  → AccessTokenGuard        (skip if @Public)
  → Controller
  → Service  (REQUEST-scoped where identity is needed; request.user.sub)
  → PrismaService → Postgres
       ↘ (optional) other feature Service
```

Any successful controller result is wrapped by `DataResponseInterceptor` as `{ statusCode, data, path, timestamp }`.
Any exception thrown along the way exits through the global filters (`PrismaExceptionFilter` first, then `AllExceptionsFilter`) as `{ statusCode, error, message, path, timestamp }`.

Cross-module examples:
- `ProductsService` → `CategoriesService` (category must exist)
- `CartsService` → `ProductsService` (availability on replace); `src/utils/cart-order-flow` for validate
- `OrdersService` → `src/utils/cart-order-flow` (assessment + summary + fulfillment); one Prisma `tx` for lock/read/create/delete
- `AuthService` uses Prisma for credential lookup and atomic refresh-session rotation

## Current domains

| Module | Route prefix | Notes |
|--------|--------------|-------|
| Auth | `/auth` | Public auth surface; see [auth.md](auth.md) |
| Categories | `/categories` | Basic CRUD (JWT required) |
| Products | `/products` | CRUD; soft-remove sets `isAvailable: false` |
| Users | `/users` | `GET/PATCH/DELETE /users/me` only; see [users.md](users.md) |
| Addresses | `/addresses` | User-scoped CRUD; see [addresses.md](addresses.md) |
| Branches | `/branches` | Location CRUD; see [branches.md](branches.md) |
| Carts | `/carts` | Own line items via Prisma; see [carts.md](carts.md) |
| Orders | `/orders` | Checkout + cancel; see [orders.md](orders.md) |

Line items (`CartItem`, `OrderItem`) are **not** separate HTTP modules. Carts own cart lines; orders create order lines at checkout.

## Domain relations

```
User 1──1 Cart 1──* CartItem *──1 Product *──1 Category
User 1──* Order 1──* OrderItem *──1 Product
User 1──* Session
User 1──* Address
Branch 1──* Order
Address 0..1──* Order   (optional FK; delivery also snapshots address fields)
```

- `CartItem` unique on `(cartId, productId)`
- `OrderItem` unique on `(orderId, productId)`
- `Session.refreshTokenHash` unique; rotations share indexed `familyId`; cascade delete with user
- `Address` cascades with user; `Order.branchId` required; `Order.addressId` optional
- Deleting a cart/order cascades to its items; branch delete blocked while orders exist
- Money fields are `Decimal` in DB; API responses use fixed 2-decimal **strings** (`src/utils/money.util.ts`)
- DB check constraints enforce non-negative money / positive quantities (see migrations)

## Rate limiting

`ThrottlerModule` + global `ThrottlerGuard` in `AppModule`:

| Named throttler | Tracker | Default |
|-----------------|---------|---------|
| `default` | IP | 60 / minute |
| `authEmail` | body `email` (skipped if missing) | 10 / minute |

Auth routes override with `@Throttle` / `@SkipThrottle` — see [auth.md](auth.md).
