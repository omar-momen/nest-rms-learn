# Inventories

Stock is **per product per branch**. There is no `Product.stockQuantity`. A
product with no inventory row at a branch has **0** available.

The cart does **not** reserve stock. Real consume happens at checkout, inside
the same Prisma transaction as order create. Cancel / delete restores.

## Two tables

| Table | Role |
|-------|------|
| `ProductInventory` | Cached current `quantity` for `(productId, branchId)` |
| `InventoryTransaction` | Append-only **ledger** — every movement as a signed `quantityDelta` |

`ProductInventory.quantity` should stay equal to the sum of ledger deltas for
that product+branch. The service updates both in one private method:
`applyDeltaInTx`.

Constraints:

- `ProductInventory` unique on `(productId, branchId)`; `quantity >= 0`
- `InventoryTransaction` unique on `(orderId, productId, type)` so one order
  cannot decrement or restore the same product twice
- Product FK is restrict (products are soft-deleted). Branch delete cascades
  inventory + ledger rows

## Ledger types

The API and order code always send a **positive** magnitude. Sign is derived
in `signedDelta` (`CREDIT` → `+`, `DEBIT` → `-`).

| Type | Sign | Who writes it | Meaning |
|------|------|---------------|---------|
| `RESTOCK` | `+` | `POST /dashboard/inventories/adjust` | Incoming stock |
| `ADJUST` | `+` or `-` | `POST /dashboard/inventories/adjust` + `direction` | Manual recount / spoilage |
| `ORDER_DECREMENT` | `-` | `OrdersService.create` via `decrementForOrderInTx` | Consumed at checkout |
| `ORDER_RESTORE` | `+` | cancel / delete / status `CANCELLED` via `restoreForOrderInTx` | Put back |

`ORDER_*` types are **not** accepted on the HTTP adjust endpoint.

## Shared helpers (`src/utils/inventory/`)

Pure functions — no Prisma. Use these instead of copying stock math.

| Helper | What it does |
|--------|----------------|
| `signedDelta(magnitude, CREDIT \| DEBIT)` | Turns a positive API number into the stored signed delta |
| `toQuantityByProductId(ids, rows)` | Builds a `Map`; missing row = `0`, never `undefined` |
| `mergeAndSortInventoryLines(items)` | Sums duplicate `productId`s, then sorts by id so locks are taken in one order (avoids deadlocks) |

Locking and writes stay in `InventoriesService`.

## Single write path

Every quantity change goes through `applyDeltaInTx(tx, …)`:

1. `FOR UPDATE` the inventory row (no-op if the row does not exist yet)
2. Upsert the row at `quantity = 0` if missing
3. `next = current + quantityDelta`; reject if `next < 0`
4. Update `ProductInventory` and insert `InventoryTransaction`

`adjust`, `decrementForOrderInTx`, and `restoreForOrderInTx` all call this.

## Module graph

`InventoriesModule` does **not** import `ProductsModule` or `BranchesModule`.
Existence checks use Prisma directly. That lets products/carts/orders import
`InventoriesService` without a circular module.

```
InventoriesModule
  → PrismaService
  → src/utils/inventory

ProductsModule  → getQuantitiesByProductId   (optional ?branchId= → availableStock)
CartsModule     → getQuantitiesByProductId   (validate; optional GET ?branchId=)
OrdersModule    → getQuantitiesByProductId + decrementForOrderInTx + restoreForOrderInTx
```

Order methods take the existing `tx` so stock and order writes commit or roll
back together.

## HTTP

Register static paths (`adjust`, `transactions`) **before** `:id`.

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/dashboard/inventories/adjust` | `RESTOCK` or `ADJUST` (`inventory:adjust`) |
| `GET` | `/dashboard/inventories` | Optional `?branchId=` / `?productId=` (`inventory:read`) |
| `GET` | `/dashboard/inventories/transactions` | Optional `?branchId=` / `?productId=` / `?orderId=` |
| `GET` | `/dashboard/inventories/transactions/:id` | One ledger row |
| `GET` | `/dashboard/inventories/:id` | One `ProductInventory` row |

Scratch: `src/modules/inventories/inventories.endpoint.http`.

### Adjust body

| Field | Required | Notes |
|-------|----------|-------|
| `productId` / `branchId` | yes | UUID; must exist → else `404` |
| `quantity` | yes | integer `>= 1` (magnitude, not signed) |
| `type` | yes | `RESTOCK` (always credit) or `ADJUST` |
| `direction` | for `ADJUST` | `CREDIT` or `DEBIT` |
| `note` | no | max 500 |

Missing inventory row is created at `0`, then the delta is applied. Next
quantity `< 0` → `400`.

## Order lifecycle

| Event | Stock |
|-------|--------|
| `POST /app/orders` | Assess vs stock map, then `ORDER_DECREMENT` per product |
| Cancel / delete `PENDING`, or status → `CANCELLED` | `ORDER_RESTORE` (no-op if a restore already exists) |
| Status → `COMPLETED` | none — already consumed at checkout |

See [orders.md](orders.md).

## Auth

Dashboard only (`DASHBOARD_ACCESS`). Reads need `inventory:read`; adjust needs `inventory:adjust`.
