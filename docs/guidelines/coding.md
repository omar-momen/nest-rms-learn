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
    update-<singular>.dto.ts
    <singular>-response.dto.ts
    index.ts          # barrel exports
```

- Register the module in `AppModule`
- Export the service when another module needs it
- Inject `PrismaService` from `@/prisma` (global module)

## DTOs

- **Input:** `Create*` / `Update*` with `class-validator` decorators
- **Output:** `*ResponseDto` type for service return types (mapping / serialization — enhance later)
- Export DTOs from `dto/index.ts`
- Controllers take input DTOs; services declare response types

## Error handling

- Do **not** null-check Prisma `create` / `findMany` results — they don't return `null` that way
- Missing entity → `NotFoundException`
- `update` / `remove`: call `findOne` first (or equivalent), then mutate
- Prefer Nest HTTP exceptions over vague `BadRequestException` for "not found"

## Basics

- Path aliases: `@/` for `src/`, `@generated/` for Prisma client
- Controllers stay thin; business + Prisma live in services
- Global `ValidationPipe` (whitelist, forbid non-whitelisted, transform) — trust it for body validation
- Config via `@nestjs/config` + Joi in `src/config`
- Cross-module: import the other feature module and inject its exported service (see products → categories)

## Reference modules

- `src/modules/categories/`
- `src/modules/products/`
