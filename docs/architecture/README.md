# Architecture

| File | Topic |
|------|--------|
| [overview.md](overview.md) | App layout, request flow, domains, rate limits |
| [auth.md](auth.md) | JWT access, refresh sessions, global guard, throttles |
| [products.md](products.md) | Catalog CRUD; optional `?branchId=` stock |
| [users.md](users.md) | Self-service profile, password updates, deletion policy |
| [addresses.md](addresses.md) | User-scoped saved addresses |
| [branches.md](branches.md) | Restaurant locations for fulfillment |
| [coupons.md](coupons.md) | Discount codes applied at checkout |
| [loyalty-transactions.md](loyalty-transactions.md) | Read-only HTTP; mutations from orders |
| [inventories.md](inventories.md) | Per-branch product stock and ledger |
| [carts.md](carts.md) | Cart aggregate: replace items, assess, validate |
| [orders.md](orders.md) | Checkout, cancel, status rules |
