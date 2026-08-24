# Carts

One cart per user (`Cart.userId` unique). Line items live in `CartItem` (`@@unique([cartId, productId])`). Managed only through `/app/carts` — no public `/cart-items` API.

## Module graph

```
CartsModule
  → ProductsModule       (product exists + isAvailable on replace)
  → InventoriesModule    (stock map for validate / optional GET `branchId`)
```

`CartsService` is `@Injectable({ scope: Scope.REQUEST })`.
Identity: `request.user.sub` from the access JWT.

Fulfillment checks for validate/checkout live in
`src/utils/cart-order-flow/` (branch + delivery address + coupon).
Stock checks use `InventoriesService.getQuantitiesByProductId` + the same
`assessCartItems` helper. Adding items to the cart does **not** change
inventory.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/app/carts` | Find-or-create cart for **current user**; optional `items` replaces contents |
| `GET` | `/app/carts` | Header only, unless `?includeItems=true`. Pass `?branchId=` with items to include stock issues |
| `PATCH` | `/app/carts` | Current user's cart; optional `items` replaces contents (`[]` clears) |
| `POST` | `/app/carts/validate` | Hard fail if invalid items, insufficient stock for `branchId`, **or** bad fulfillment |
| `DELETE` | `/app/carts` | Delete current user's cart (cascade items) |

There is no `:id` route — the cart is always scoped to JWT `sub` (one cart per user).

Scratch: `src/modules/carts/carts.endpoint.http`.

## Item replace (`create` / `update` when `items` present)

1. Reject duplicate `productId`s → `400`
2. Each product must exist and `isAvailable` → `400` if not
3. In a transaction: delete lines not in the payload; upsert the rest

## Soft vs hard assessment

Shared helper: `src/utils/cart-order-flow/line-items-assessment.util.ts` (`assessCartItems`).

| | Soft (`GET /app/carts?includeItems=true`) | Hard (`POST /app/carts/validate`) |
|--|--------------------------------|-------------------------------|
| Empty cart | `valid: false`, `EMPTY_CART` | `400` with issues |
| Unavailable product | `UNAVAILABLE` | then `400` |
| `quantity < 1` | `INVALID_QUANTITY` | then `400` |
| `price < 0` | `INVALID_PRICE` (0 is allowed) | then `400` |
| Stock | `INSUFFICIENT_STOCK` **only if** `branchId` is on the query | always checked (`branchId` is required on the body) → `400` |
| Fulfillment | not checked | `assertCheckoutFulfillment` |

`GET /app/carts` without `includeItems` returns `{ id, userId, createdAt, updatedAt }` only. Without `branchId`, `assessCartItems` skips stock (the map is omitted).

### Validate body

| Field | Required | Notes |
|-------|----------|-------|
| `type` | yes | `OrderType` |
| `branchId` | yes | Must exist |
| `addressId` | for `DELIVERY` only | Required + owned for delivery; rejected for other types |
| `couponCode` / `loyaltyPointsAmount` / `paymentMethod` | no | coupon applied to summary; loyalty/payment stubs |

Carts always load by `userId: JWT sub`, so missing cart → `404` (no separate ownership-by-id path).

Ownership helper still used as a defensive assert: `src/utils/cart-order-flow/assert-user-ownership.util.ts` (`assertUserOwnsCartOrOrder`).

## Summary

Pure `src/utils/cart-order-flow/checkout-summary.util.ts` (`calculateCartSummary`) builds
`{ subtotal, discount, tax, total }` as money strings via `Decimal` math. Both
carts and transactional checkout reuse it without service or database access.

Coupon discount is applied when a coupon is passed; tax / loyalty are stubs (TODO).

## Auth

Caller id from JWT `sub` (`request.user.sub`). Global `AccessTokenGuard` — no `@Public` on cart routes.

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
