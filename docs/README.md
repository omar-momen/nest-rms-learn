# Developer docs

Growing docs. Prefer short pages; expand when a convention sticks.

## New developer map

1. [Project overview](architecture/overview.md) — folders & request flow
2. [Coding guidelines](guidelines/coding.md) — naming, DTOs, money, errors
3. Walk modules in this order:
   - `src/modules/categories/` — basic CRUD
   - `src/modules/products/` — cross-module inject + response mapping
   - [carts](architecture/carts.md) — aggregate + assessment
   - [orders](architecture/orders.md) — transaction checkout + status rules
4. Cursor: [`.cursor/rules/`](../.cursor/rules/) and skills under [`.cursor/skills/`](../.cursor/skills/)

## Index

| Path | Status | Notes |
|------|--------|-------|
| [architecture/overview.md](architecture/overview.md) | active | App layout & domains |
| [architecture/carts.md](architecture/carts.md) | active | Cart create / replace / assess / validate |
| [architecture/orders.md](architecture/orders.md) | active | Checkout & status |
| [guidelines/coding.md](guidelines/coding.md) | active | Rules we follow now |
| [guidelines/README.md](guidelines/README.md) | index | Add new guideline pages here |

## How to grow these docs

- New convention → add a bullet to `guidelines/coding.md` (or a new file + link here)
- New area (auth, payments, etc.) → add a short page under `architecture/`
- Keep Cursor rules in sync with guidelines (same ideas, fewer words)
