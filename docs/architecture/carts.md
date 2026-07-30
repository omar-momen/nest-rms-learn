# Carts

One cart per user (`Cart.userId` unique). Line items live in `CartItem` (`@@unique([cartId, productId])`). Managed only through `/carts` — no public `/cart-items` API.

## Module graph

```
CartsModule
  → ProductsModule    (product exists + isAvailable on replace)
```

Cart rows/items are written with `PrismaService` inside `CartsService`.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/carts` | Find-or-create cart for current user; optional `items` replaces contents |
| `GET` | `/carts` | List carts (each with items + soft assessment + summary) |
| `GET` | `/carts/:id` | Cart only (no items) |
| `GET` | `/carts/:id?includeItems=true` | Cart + items + soft assessment + summary |
| `PATCH` | `/carts/:id` | Ownership check; optional `items` replaces contents (`[]` clears) |
| `POST` | `/carts/:id/validate` | Ownership + hard fail if invalid |
| `DELETE` | `/carts/:id` | Ownership check; delete cart (cascade items) |

Scratch: `src/modules/carts/carts.endpoint.http`.

## Item replace (`create` / `update` when `items` present)

1. Reject duplicate `productId`s → `400`
2. Each product must exist and `isAvailable` → `400` if not
3. In a transaction: delete lines not in the payload; upsert the rest

## Soft vs hard assessment

Shared helper: `utils/cart-assessment.util.ts` (`assessCartItems`).

| | Soft (`GET` list / `?includeItems=true`) | Hard (`POST …/validate`) |
|--|------------------------------------------|---------------------------|
| Empty cart | `valid: false`, `EMPTY_CART` | `400` with issues |
| Unavailable product | `UNAVAILABLE` | then `400` |
| `quantity < 1` | `INVALID_QUANTITY` | then `400` |
| `price < 0` | `INVALID_PRICE` (0 is allowed) | then `400` |
| Ownership | list/get soft: not required; update/validate/delete: required | yes |

Ownership helper: `utils/cart-ownership.util.ts` (`assertUserOwnsCart`).

## Summary

`summaryFromItems` builds `{ subtotal, discount, tax, total }` as money strings via `Decimal` math.

Discount / tax / coupon / loyalty are stubs (TODO).

## Auth note

User id comes from `DEV_CURRENT_USER_ID` until auth exists.

## Assessed cart shape

```ts
{
  id, userId, createdAt, updatedAt,
  cartItems?: [...],   // product.price is a money string
  valid?: boolean,
  issues?: CartItemIssueDto[],
  summary?: { subtotal, discount, tax, total }  // money strings
}
```
