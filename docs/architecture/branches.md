# Branches

Restaurant locations used at checkout. App can **read**; dashboard can CRUD.

## Module graph

```
BranchesModule
  → PrismaService
```

`BranchesService` is singleton (no request scope).

Scratch: `src/modules/branches/branches.endpoint.http`.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/app/branches` | List all |
| `GET` | `/app/branches/:id` | Get one → `404` if missing |
| `GET` | `/dashboard/branches` | List all (staff) |
| `GET` | `/dashboard/branches/:id` | Get one |
| `POST` | `/dashboard/branches` | Create (`branches:write`) |
| `PATCH` | `/dashboard/branches/:id` | Update (`branches:write`) |
| `DELETE` | `/dashboard/branches/:id` | Delete if no orders (`branches:write`); else `400` |

Deleting a branch **cascades** `ProductInventory` and `InventoryTransaction`
rows. Orders still block the delete (restrict FK).

## Fields

`name`, `location`.

## Checkout use

Every order requires `branchId`. Checkout validates the branch exists (`assertBranchAvailable`). Branch `name` / `location` are **snapshotted** onto the order (`branchName`, `branchLocation`) and linked via `branchId`. Stock is also per branch — see [inventories.md](inventories.md) and [orders.md](orders.md).

Closed / busy / service-area checks are stubbed (TODO in `checkout-validation.util.ts`).
