# Products

Catalog CRUD. Price is Prisma `Decimal` in the DB and a money **string** in
responses (`serializeMoney`). Soft-remove sets `isAvailable: false` so cart
and order FKs stay valid.

## Module graph

```
ProductsModule
  → CategoriesModule     (category must exist)
  → InventoriesModule    (optional branch stock on GET)
```

`ProductsService` is a singleton (no request scope).

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/app/products` | List; optional `?branchId=` adds `availableStock` |
| `GET` | `/app/products/:id` | Get one; optional `?branchId=` |
| `GET` | `/dashboard/products` | Same list (staff) |
| `GET` | `/dashboard/products/:id` | Same get (staff) |
| `POST` | `/dashboard/products` | Create (`products:write`); `categoryId` must exist |
| `PATCH` | `/dashboard/products/:id` | Update (`products:write`) |
| `DELETE` | `/dashboard/products/:id` | Soft-unavailable (`products:write`) |

Scratch: `src/modules/products/products.endpoint.http`.

## Branch stock on GET

Stock lives on `ProductInventory`, not on `Product`. When `branchId` is
passed, `InventoriesService.getQuantitiesByProductId` fills
`availableStock` (missing row = `0`). Without `branchId` the field is omitted.

See [inventories.md](inventories.md).
