# Developer docs

Growing docs. Prefer short pages; expand when a convention sticks.

## New developer map

1. [Project overview](architecture/overview.md) — folders & request flow
2. [Coding guidelines](guidelines/coding.md) — naming, DTOs, money, errors
3. Walk modules in this order:
   - `src/modules/categories/` — basic CRUD
   - `src/modules/products/` — cross-module inject + response mapping
   - [auth](architecture/auth.md) — JWT + refresh sessions + guard
   - [users](architecture/users.md) — self-service profile + deletion policy
   - [addresses](architecture/addresses.md) — user-scoped addresses
   - [branches](architecture/branches.md) — locations for checkout
   - [carts](architecture/carts.md) — aggregate + assessment + validate fulfillment
   - [orders](architecture/orders.md) — transaction checkout + cancel
4. Cursor: [`.cursor/rules/`](../.cursor/rules/) and skills under [`.cursor/skills/`](../.cursor/skills/)

## Index

| Path | Status | Notes |
|------|--------|-------|
| [architecture/overview.md](architecture/overview.md) | active | App layout & domains |
| [architecture/auth.md](architecture/auth.md) | active | JWT access + refresh sessions |
| [architecture/users.md](architecture/users.md) | active | Self-service profile + deletion policy |
| [architecture/addresses.md](architecture/addresses.md) | active | User-scoped address CRUD |
| [architecture/branches.md](architecture/branches.md) | active | Branch CRUD for fulfillment |
| [architecture/carts.md](architecture/carts.md) | active | Cart create / replace / assess / validate |
| [architecture/orders.md](architecture/orders.md) | active | Checkout & cancel |
| [guidelines/coding.md](guidelines/coding.md) | active | Rules we follow now |
| [guidelines/README.md](guidelines/README.md) | index | Add new guideline pages here |

## How to grow these docs

- New convention → add a bullet to `guidelines/coding.md` (or a new file + link here)
- New area (auth, payments, etc.) → add a short page under `architecture/`
- Keep Cursor rules in sync with guidelines (same ideas, fewer words)
