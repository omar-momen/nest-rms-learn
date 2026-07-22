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
prisma/                   # schema + migrations
generated/prisma/         # Prisma client output
```

## Request flow

```
HTTP → Controller → Service → PrismaService → Postgres
                ↘ (optional) other feature Service
```

## Current domains

| Module | Route prefix | Notes |
|--------|--------------|-------|
| Categories | `/categories` | CRUD; exports service |
| Products | `/products` | CRUD; checks category exists via `CategoriesService` |

<!-- Add domains here as the RMS grows -->
