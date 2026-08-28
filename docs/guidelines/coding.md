# Coding guidelines

Source of truth for humans. Mirror the important bits in `.cursor/rules/`.

## Naming (plural)

- Folder: `src/modules/<plural>/` (e.g. `categories`, `products`)
- Files & classes: plural — `categories.module.ts` → `CategoriesModule`, `CategoriesController`, `CategoriesService`
- Routes: plural REST paths under a surface — `@AppController('categories')` → `/app/categories`, `@DashboardController('products')` → `/dashboard/products`
- HTTP scratch files: `<plural>.endpoint.http`
- Shared login stays at `/auth`; do not prefix `/health`
- DTOs: singular domain noun is OK — `CreateCategoryDto`, `CategoryResponseDto`

## Module layout

```
src/modules/<plural>/
  <plural>.module.ts
  <plural>.controller.ts              # app surface (or dashboard-only)
  <plural>.dashboard.controller.ts    # optional second surface
  <plural>.service.ts
  <plural>.endpoint.http
  dto/
    create-<singular>.dto.ts
    update-<singular>.dto.ts   # when the resource is updatable
    <singular>-response.dto.ts
    index.ts                   # barrel exports
  utils/                       # optional pure helpers (status rules, assess, …)
```

- Register the module in `AppModule` when it exposes HTTP (or is imported by another module)
- Export the service when another module needs it
- Inject `PrismaService` from `@/modules/prisma` (global module)

## Aggregates vs child tables

- Prefer one HTTP surface per aggregate (`/app/carts` owns `CartItem`; `/app/orders` creates `OrderItem` at checkout)
- Do **not** expose separate CRUD modules for child rows unless they are a real independent resource
- Child response shapes can live in the parent module's `dto/` (e.g. `OrderItemResponseDto` under `orders/`)

## DTOs

- **Input:** `Create*` / `Update*` with `class-validator` decorators
- ID fields (`*Id`) use `@IsUUID()`, not `@IsString()`
- **Output:** `*ResponseDto` on service return types; map with a private `toResponseDto` when the Prisma model differs (password omit, money strings, etc.)
- Export DTOs from `dto/index.ts`
- Controllers take input DTOs; services declare response types

## Money

- Store as Prisma `Decimal`
- Compute with `src/utils/money.util.ts` (`toDecimal`, `multiplyMoney`, `sumMoney`, `serializeMoney`)
- Serialize API money fields as fixed 2-decimal **strings** (e.g. `"12.50"`)

## Error handling

- Do **not** null-check Prisma `create` / `findMany` results — they don't return `null` that way
- Missing entity → `NotFoundException`
- `update` / `remove`: call `findOne` first (or equivalent), then mutate
- Business rule failures → `BadRequestException` (or `ForbiddenException` for ownership)
- Prefer Nest HTTP exceptions over vague `BadRequestException` for "not found"
- Validate ids at the edge: `@Param('id', ParseUUIDPipe)` — a malformed id is a `400`, never a DB round-trip
- Leaked Prisma errors are mapped by the global `PrismaExceptionFilter` (`src/common/filters/`): P2002 → `409`, P2001/P2025 → `404`, P2000/P2003/P2011/P2014 → `400`, anything else → `500` + logged. It is a safety net, not a substitute for explicit checks in services
- Everything else lands in the global `AllExceptionsFilter`; non-HTTP exceptions become `500` + logged stack, and both filters emit the same body:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Record not found",
  "path": "/orders/9f0…",
  "timestamp": "2026-08-10T12:00:00.000Z"
}
```

- `message` stays an array for `ValidationPipe` failures. Register both via `APP_FILTER` in `AppModule`, catch-all **before** the Prisma filter — Nest resolves global filters in reverse order, so the last one registered is tried first

## Basics

- Path aliases: `@/` for `src/`, `@generated/` for Prisma client
- Controllers stay thin; business + Prisma live in services
- Successful HTTP bodies are wrapped by the global `DataResponseInterceptor` (`src/common/interceptors/`) into:

```json
{
  "statusCode": 200,
  "data": { "...": "..." },
  "path": "/app/products",
  "timestamp": "2026-08-10T12:00:00.000Z"
}
```

Controllers/services still return `*ResponseDto` (or arrays / plain objects) — do not wrap manually.
- Global `ValidationPipe` (whitelist, forbid non-whitelisted, transform) — trust it for body validation
- Config via `@nestjs/config` + Joi in `src/config`
- Cross-module: import the other feature module and inject its exported service (see products → categories)
- Identity: JWT access token via global `AccessTokenGuard` (signature + active session family); services that need the caller use `@Injectable({ scope: Scope.REQUEST })` + `request.user.sub`. Role comes from the DB on each request (`request.user.role`). See [auth.md](../architecture/auth.md)
- New HTTP controllers use `@AppController` or `@DashboardController`. Extra checks via `@RequirePermissions(...)`. Add a `Permission` + `ROLE_PERMISSIONS` entry when a new capability is needed — do not invent a second guard style
- Users HTTP surface is `/app/users/me` (self), not open admin CRUD
- Never persist a password directly from a DTO; hash it on every create/update path
- Self password change is `PATCH /app/users/me/password` with current + new; it must revoke other session families (`AuthService.revokeOtherSessionFamilies`)
- Forgot / reset password is `POST /auth/forgot-password` (6-digit OTP) then `POST /auth/reset-password` with `{ email, otp, newPassword }`; production sends OTP via `sendPasswordResetOtp`; a successful reset revokes **all** session families
- User hard-delete is allowed only with no cart or orders; lock and check dependencies in one transaction. See [users.md](../architecture/users.md)
- Global `ThrottlerGuard`; auth routes use `@Throttle` / `@SkipThrottle` overrides. See [overview.md](../architecture/overview.md)
- Checkout fulfillment (`type`, `branchId`, delivery `addressId`, coupon) is shared via `src/utils/cart-order-flow/`
- Stock helpers live in `src/utils/inventory/` (`signedDelta`, `toQuantityByProductId`, `mergeAndSortInventoryLines`). Do not copy Prisma stock queries into products/carts

## Ledgers (loyalty + inventory)

- HTTP / order code send a **positive** magnitude. Persist a **signed** delta (`CREDIT` → `+`, `DEBIT` → `-`)
- Keep a cached balance (`User.loyaltyPointsBalance`, `ProductInventory.quantity`) and an append-only transaction table. Update both in one `*InTx` method
- Missing inventory row means **0**, not “unlimited”
- `InventoriesModule` must not import `ProductsModule` (products already import inventories)
- Static routes before params: `/dashboard/inventories/transactions` and `/app/loyalty-transactions/balance` before `:id`

## Reference modules

- `src/modules/categories/` — basic CRUD
- `src/modules/products/` — CRUD + `CategoriesService` + optional branch stock; see [products.md](../architecture/products.md)
- `src/modules/auth/` — register/login/refresh/logout + AccessTokenGuard + PermissionsGuard; see [auth.md](../architecture/auth.md)
- `src/modules/users/` — `/app/users/me` + `/dashboard/users` (admin); see [users.md](../architecture/users.md)
- `src/modules/addresses/` — user-scoped address CRUD; see [addresses.md](../architecture/addresses.md)
- `src/modules/branches/` — branch CRUD for fulfillment; see [branches.md](../architecture/branches.md)
- `src/modules/coupons/` — discount codes; see [coupons.md](../architecture/coupons.md)
- `src/modules/loyalty-transactions/` — points ledger; see [loyalty-transactions.md](../architecture/loyalty-transactions.md)
- `src/modules/inventories/` — per-branch stock + ledger; see [inventories.md](../architecture/inventories.md)
- `src/modules/carts/` — aggregate (items + assess/validate); see [carts.md](../architecture/carts.md)
- `src/modules/orders/` — checkout transaction + cancel; see [orders.md](../architecture/orders.md)
