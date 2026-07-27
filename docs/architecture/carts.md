# Carts

One cart per user (`User.cart` / `Cart.userId` unique). Line items live in `CartItem` with `@@unique([cartId, productId])`.

## Module graph

```
CartsModule
  → CartItemsModule   (line-item CRUD + bulk helpers)
  → ProductsModule    (product existence on replace)

CartItemsModule       (also exposed at /cart-items for direct CRUD)
UsersModule           (user CRUD; cart create currently hardcodes a user id)
```

Preferred client path: **`/carts`** with an `items` payload. `/cart-items` is the lower-level resource used by `CartsService` (and available for direct calls).

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/carts` | Find-or-create cart for current user; optional `items` replaces contents |
| `GET` | `/carts` | List carts |
| `GET` | `/carts/:id` | Cart only |
| `GET` | `/carts/:id?includeItems=true` | Cart + items + soft assessment + summary |
| `PATCH` | `/carts/:id` | Optional `items` replaces full contents (omitted products removed; `[]` clears) |
| `POST` | `/carts/:id/validate` | Ownership check + hard fail if invalid; optional coupon / loyalty for summary |
| `DELETE` | `/carts/:id` | Delete cart (cascade deletes items) |

Scratch requests: `src/modules/carts/carts.endpoint.http`.

## Item replace (`create` / `update`)

When `items` is present:

1. Reject duplicate `productId`s → `400`
2. Ensure each product exists **and** `isAvailable` via `ProductsService.findOne` → `400` if unavailable
3. `CartItemsService.removeNotInProducts` (empty list clears the cart)
4. Upsert each line: update quantity if `(cartId, productId)` exists, else create

Not wrapped in a transaction yet (TODO in service).

## Soft vs hard assessment

Both paths use the same `assessItems` checks. Difference is response vs throw.

| | Soft (`GET ?includeItems=true`) | Hard (`POST …/validate`) |
|--|--------------------------------|---------------------------|
| Empty cart | `valid: false`, `EMPTY_CART` issue | `400` with issues |
| Missing product or `isAvailable: false` | `UNAVAILABLE` | same, then `400` |
| `quantity < 1` | `INVALID_QUANTITY` | same, then `400` |
| `price <= 0` | `INVALID_PRICE` | same, then `400` |
| Ownership | not checked | cart must belong to current user (`403` otherwise) |

Issue shape: `{ cartItemId, productId, code, message }` (`CartItemIssueCode`).

## Summary

`calculateSummary` builds `{ subtotal, discount, tax, total }` from line items × product price.

- Discount / tax / coupon / loyalty are stubs (TODO)
- Validate accepts optional `couponCode` and `loyaltyPointsAmount` and passes them into summary (not applied yet)

## Auth note

User id is still hardcoded in cart create / validate and cart-item update. Swap for request context when auth lands.

## Data shape (assessed cart)

```ts
{
  id, userId, createdAt, updatedAt,
  cartItems?: [...],   // when includeItems / after validate
  valid?: boolean,
  issues?: CartItemIssueDto[],
  summary?: { subtotal, discount, tax, total }
}
```
