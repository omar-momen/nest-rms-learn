# Branches

Restaurant locations used at checkout. Not user-scoped — any authenticated caller can CRUD (no role layer yet).

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
| `POST` | `/branches` | Create branch |
| `GET` | `/branches` | List all |
| `GET` | `/branches/:id` | Get one → `404` if missing |
| `PATCH` | `/branches/:id` | Update |
| `DELETE` | `/branches/:id` | Delete only if no orders reference it → else `400` |

## Fields

`name`, `location`.

## Checkout use

Every order requires `branchId`. Checkout validates the branch exists (`assertBranchAvailable`). Branch `name` / `location` are **snapshotted** onto the order (`branchName`, `branchLocation`) and linked via `branchId`. See [orders.md](orders.md).

Closed / busy / service-area checks are stubbed (TODO in `checkout-validation.util.ts`).
