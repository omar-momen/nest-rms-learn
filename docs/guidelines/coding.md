# Coding guidelines

Source of truth for humans. Mirror the important bits in `.cursor/rules/`.

## Naming (plural)

- Folder: `src/modules/<plural>/` (e.g. `categories`, `products`)
- Files & classes: plural — `categories.module.ts` → `CategoriesModule`, `CategoriesController`, `CategoriesService`
- Routes: plural REST paths — `@Controller('categories')`
- HTTP scratch files: `<plural>.endpoint.http`
- DTOs: singular domain noun is OK — `CreateCategoryDto`, `CategoryResponseDto`

## Module layout

```
src/modules/<plural>/
  <plural>.module.ts
  <plural>.controller.ts
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
- Inject `PrismaService` from `@/prisma` (global module)

## Aggregates vs child tables

- Prefer one HTTP surface per aggregate (`/carts` owns `CartItem`; `/orders` creates `OrderItem` at checkout)
- Do **not** expose separate CRUD modules for child rows unless they are a real independent resource
- Child response shapes can live in the parent module's `dto/` (e.g. `OrderItemResponseDto` under `orders/`)

## DTOs

- **Input:** `Create*` / `Update*` with `class-validator` decorators
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

## Basics

- Path aliases: `@/` for `src/`, `@generated/` for Prisma client
- Controllers stay thin; business + Prisma live in services
- Global `ValidationPipe` (whitelist, forbid non-whitelisted, transform) — trust it for body validation
- Config via `@nestjs/config` + Joi in `src/config`
- Cross-module: import the other feature module and inject its exported service (see products → categories)
- Temporary user: `DEV_CURRENT_USER_ID` in `src/constants/dev-current-user.ts` until auth

## Reference modules

- `src/modules/categories/` — basic CRUD
- `src/modules/products/` — CRUD + cross-module inject (`CategoriesService`) + response mapping
- `src/modules/carts/` — aggregate (items + assess/validate); see [carts.md](../architecture/carts.md)
- `src/modules/orders/` — checkout transaction + status rules; see [orders.md](../architecture/orders.md)
