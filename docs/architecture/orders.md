# Orders

Checkout turns the current user's cart into an order, then deletes the cart (disposable cart). Order lines are created only at checkout — no public `/order-items` API.

## Module graph

```
OrdersModule
  → src/utils/cart-order-flow  (assessment + summary + checkout fulfillment; no Orders↔Carts service inject)
  → PrismaService    (FOR UPDATE lock, read, create order/items, delete cart)
```

`OrdersService` is `@Injectable({ scope: Scope.REQUEST })`.
Identity: `request.user.sub` for create / list / get / cancel / delete.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/orders` | Lock cart → validate items + fulfillment → create order + items → delete cart |
| `GET` | `/orders` | List orders for **current user** (includes `orderItems`, `address`, `branch`) |
| `GET` | `/orders/:id` | Get one scoped to current user (`findFirst` by `id` + `userId`); missing/other user's → `404` |
| `PATCH` | `/orders/:id/status` | Cancel only (`CANCELLED`); uses `assertAllowedStatusTransition` |
| `DELETE` | `/orders/:id` | Only if status is `PENDING` (same user-scoped lookup in a transaction) |

Scratch: `src/modules/orders/orders.endpoint.http`.

`OrdersService.changeStatus` still exists for the full transition table but is **not** exposed on the controller. The HTTP surface only cancels via `PATCH …/status`.

## Create body

| Field | Required | Notes |
|-------|----------|-------|
| `type` | yes | `DINE_IN` \| `PICKUP` \| `CURBSIDE` \| `DELIVERY` |
| `branchId` | yes | Must exist |
| `paymentMethod` | yes | `CASH` \| `CARD` \| `ONLINE` |
| `addressId` | for `DELIVERY` only | Required and owned for delivery; rejected for other types |
| `couponCode` | no | validated + applied to order totals |
| `loyaltyPointsAmount` | no | stub (`>= 0`) |

## Checkout (`POST /orders`)

Inside `$transaction`:

1. `SELECT … FOR UPDATE` on the user's cart (and its items) via `tx`
2. Ownership check on locked row
3. Load cart + items + products via **`tx.cart.findUnique`** (same transaction client as the lock)
4. Assess those already-loaded rows with pure `assessCartItems`
5. Fail if invalid → `400`
6. `assertCheckoutFulfillment` — branch exists; if `DELIVERY`, owned `addressId` required; otherwise `addressId` is rejected
7. Snapshot address fields (when `addressId`) and branch `name` / `location` onto the order
8. Calculate totals with pure `calculateCartSummary`
9. Create `Order` + `OrderItem`s (snapshot `unitPrice` from product)
10. Delete cart

No cart data is re-read through the default Prisma client. The lock, decision
inputs, order writes, and cart deletion all belong to one transaction.

## Status transitions

`utils/order-status.util.ts` (used by cancel + unused `changeStatus`):

| From | Allowed next |
|------|----------------|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `COMPLETED` |
| `COMPLETED` / `CANCELLED` | (none) |

HTTP cancel: `PENDING` → `CANCELLED` only (other transitions not exposed yet).
Delete allowed only for `PENDING`.

## Money & snapshots in responses

Order totals and each `orderItems[].unitPrice` are fixed 2-decimal **strings**.

Response includes live `address` / `branch` relations when present, plus denormalized address columns snapshotted at checkout. Coupon / loyalty / payment application still TODO.

## Auth

All order paths use JWT `sub`.
