# Overview

## Layout

```
src/
  main.ts                 # helmet + CORS + ValidationPipe + cookie-parser + shutdown hooks
  app.module.ts           # root imports + global JwtModule + ThrottlerModule / ThrottlerGuard + APP_FILTER + APP_INTERCEPTOR
  config/                 # env config + Joi validation
  common/
    throttler/            # default + authEmail throttler options
    middleware/           # RequestLoggingMiddleware
    filters/              # AllExceptionsFilter (unified body) + PrismaExceptionFilter (P2002→409, etc.)
    interceptors/         # DataResponseInterceptor (wraps success payloads)
    responses/            # DataResponseBody + ErrorResponseBody
  utils/
    money.util.ts         # Decimal convert / compute / serialize
    cart-order-flow/      # assess lines, summary, fulfillment (cart + order)
    inventory/            # signedDelta, stock map, merge-and-sort lines
  modules/
    prisma/               # PrismaModule (global) + PrismaService
    auth/                 # /auth + AccessTokenGuard + PermissionsGuard + app/dashboard decorators
    categories/           # app GET + dashboard CRUD
    products/             # app GET + dashboard CRUD; optional branch stock
    users/                # /app/users/me + /dashboard/users (admin role/list)
    addresses/            # user-scoped saved addresses
    branches/             # restaurant locations for fulfillment
    coupons/              # discount codes; applied at validate/checkout
    loyalty-transactions/ # points ledger + cached User.loyaltyPointsBalance
    inventories/          # per-branch product stock + ledger
    carts/                # aggregate: find-or-create, replace items, assess/validate
    orders/               # checkout from cart; cancel; status rules in util
    health/               # GET /health (public, unwrapped Terminus payload)
prisma/                   # schema + migrations
generated/prisma/         # Prisma client output
```

## Request flow

```
HTTP
  → cookie-parser
  → ThrottlerGuard          (default IP limit; auth routes tighten further)
  → AccessTokenGuard        (skip if @Public)
  → PermissionsGuard        (skip if @Public or no @RequirePermissions)
  → Controller
  → Service  (REQUEST-scoped where identity is needed; request.user.sub)
  → PrismaService → Postgres
       ↘ (optional) other feature Service
```

Any successful controller result is wrapped by `DataResponseInterceptor` as `{ statusCode, data, path, timestamp }`.
Any exception thrown along the way exits through the global filters (`PrismaExceptionFilter` first, then `AllExceptionsFilter`) as `{ statusCode, error, message, path, timestamp }`.

Cross-module examples:
- `ProductsService` → `CategoriesService` (category must exist); `InventoriesService.getQuantitiesByProductId` when `?branchId=` is present
- `CartsService` → `ProductsService` (availability on replace); `InventoriesService` for stock on validate / optional GET; `src/utils/cart-order-flow` for assess + fulfillment
- `OrdersService` → `src/utils/cart-order-flow`; `InventoriesService` decrement/restore; `LoyaltyTransactionsService` redeem/refund/earn — all inside one Prisma `tx`
- `AuthService` uses Prisma for credential lookup and atomic refresh-session rotation
- `InventoriesModule` does **not** import `ProductsModule` (avoids a cycle)

## Current domains

| Module | Route prefix | Notes |
|--------|--------------|-------|
| Auth | `/auth` | Public auth surface; see [auth.md](auth.md) |
| Health | `/health` | Public Terminus check; skips data wrapper + throttle |
| Categories | `/app/categories` (GET), `/dashboard/categories` | App catalog; writes need `categories:write` |
| Products | `/app/products` (GET), `/dashboard/products` | Soft-remove; writes need `products:write`; see [products.md](products.md) |
| Users | `/app/users`, `/dashboard/users` | Self `/me` vs admin list/role; see [users.md](users.md) |
| Addresses | `/app/addresses` | User-scoped CRUD; see [addresses.md](addresses.md) |
| Branches | `/app/branches` (GET), `/dashboard/branches` (CRUD) | Location CRUD; see [branches.md](branches.md) |
| Coupons | `/dashboard/coupons` | Discount codes; see [coupons.md](coupons.md) |
| Loyalty | `/app/loyalty-transactions` | Points ledger; see [loyalty-transactions.md](loyalty-transactions.md) |
| Inventories | `/dashboard/inventories` | Per-branch stock + ledger; see [inventories.md](inventories.md) |
| Carts | `/app/carts` | Own line items via Prisma; see [carts.md](carts.md) |
| Orders | `/app/orders`, `/dashboard/orders` | Customer checkout vs staff status; see [orders.md](orders.md) |

Line items (`CartItem`, `OrderItem`) are **not** separate HTTP modules. Carts own cart lines; orders create order lines at checkout. Inventory and loyalty **ledger** rows are listed under their parent module (`/dashboard/inventories/transactions`, `/app/loyalty-transactions`), not as their own feature folders.

## Domain relations

```
User 1──1 Cart 1──* CartItem *──1 Product *──1 Category
User 1──* Order 1──* OrderItem *──1 Product
User 1──* Session
User 1──* Address
User 1──* LoyaltyTransaction
Branch 1──* Order
Branch 1──* ProductInventory *──1 Product
Product 1──* InventoryTransaction
Order 0──* InventoryTransaction
Order 0──* LoyaltyTransaction
Coupon 0──* Order
Address 0..1──* Order   (optional FK; delivery also snapshots address fields)
```

- `CartItem` unique on `(cartId, productId)`
- `OrderItem` unique on `(orderId, productId)`
- `ProductInventory` unique on `(productId, branchId)`
- `InventoryTransaction` unique on `(orderId, productId, type)`
- `Session.refreshTokenHash` unique; rotations share indexed `familyId`; cascade delete with user
- `Address` cascades with user; `Order.branchId` required; `Order.addressId` optional
- Deleting a cart/order cascades to its items. Branch delete is blocked while orders exist; inventory + inventory ledger rows cascade with the branch
- Cart does **not** reserve stock. Checkout decrements; cancel/delete restores. Missing inventory row = 0
- Money fields are `Decimal` in DB; API responses use fixed 2-decimal **strings** (`src/utils/money.util.ts`)
- Loyalty and inventory ledgers store **signed** deltas; HTTP bodies send a positive magnitude
- DB check constraints enforce non-negative money / quantities / non-zero ledger deltas (see migrations)

## Rate limiting

`ThrottlerModule` + global `ThrottlerGuard` in `AppModule`:

| Named throttler | Tracker | Default |
|-----------------|---------|---------|
| `default` | IP | 60 / minute |
| `authEmail` | body `email` (skipped if missing) | 10 / minute |

Auth routes override with `@Throttle` / `@SkipThrottle` — see [auth.md](auth.md).
`GET /health` uses `@SkipThrottle()`.
