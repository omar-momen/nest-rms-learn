# Orders

Checkout turns the current user's cart into an order, then deletes the cart (disposable cart). Order lines are created only at checkout — no public `/order-items` API.

## Module graph

```
OrdersModule
  → LoyaltyTransactionsModule  (redeem / refund / earn inside order txs)
  → InventoriesModule          (decrement at checkout; restore on cancel/delete)
  → src/utils/cart-order-flow  (assessment + summary + checkout fulfillment; no Orders↔Carts service inject)
  → PrismaService    (FOR UPDATE lock, read, create order/items, delete cart)
```

`OrdersService` is `@Injectable({ scope: Scope.REQUEST })`.
Identity: `request.user.sub` for **app** create / list / get / cancel / delete.
Dashboard list/get/status are not scoped to the caller; loyalty earn/refund still uses **`order.userId`**.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/app/orders` | Lock cart → validate (incl. stock) → create order + items → decrement stock → redeem loyalty if requested → delete cart |
| `GET` | `/app/orders` | List orders for **current user** |
| `GET` | `/app/orders/:id` | Get one scoped to current user; missing/other user's → `404` |
| `PATCH` | `/app/orders/:id/cancel` | `PENDING` → `CANCELLED`; restores stock; refunds redeemed points |
| `DELETE` | `/app/orders/:id` | Only if status is `PENDING`; restores stock; refunds redeemed points then deletes |
| `GET` | `/dashboard/orders` | List **all** orders (`orders:manage`) |
| `GET` | `/dashboard/orders/:id` | Get any order |
| `PATCH` | `/dashboard/orders/:id/status` | Allowed transitions; earn on `COMPLETED`; restore + refund on `CANCELLED` |

Scratch: `src/modules/orders/orders.endpoint.http`.

## Create body

| Field | Required | Notes |
|-------|----------|-------|
| `type` | yes | `DINE_IN` \| `PICKUP` \| `CURBSIDE` \| `DELIVERY` |
| `branchId` | yes | Must exist |
| `paymentMethod` | yes | `CASH` \| `CARD` \| `ONLINE` |
| `addressId` | for `DELIVERY` only | Required and owned for delivery; rejected for other types |
| `couponCode` | no | validated + applied to order totals |
| `loyaltyPointsAmount` | no | integer points (`>= 0`); redeemed 1:1 against balance at checkout |

## Checkout (`POST /app/orders`)

Inside `$transaction`:

1. `SELECT … FOR UPDATE` on the user's cart (and its items) via `tx`
2. Ownership check on locked row
3. Load cart + items + products via **`tx.cart.findUnique`** (same transaction client as the lock)
4. Load stock for `branchId` via `InventoriesService.getQuantitiesByProductId(..., tx)` (missing row = 0)
5. `assessCartItems(cartItems, stockByProductId)` — fail if invalid / insufficient → `400`
6. `assertCheckoutFulfillment` — branch exists; if `DELIVERY`, owned `addressId` required; otherwise `addressId` is rejected; coupon increment happens here when `fulfillmentPlace === 'order'`
7. Snapshot address fields (when `addressId`) and branch `name` / `location` onto the order
8. Calculate totals with `calculateCartSummary`
9. Create `Order` + `OrderItem`s (snapshot `unitPrice` from product)
10. `decrementForOrderInTx` — merge/sort lines, lock inventory, debit, write `ORDER_DECREMENT`
11. If `loyaltyPointsAmount > 0`, `redeemInTx` (lock user balance, insert `REDEEM`, fail with `400` if insufficient)
12. Delete cart

No cart data is re-read through the default Prisma client. The lock, decision
inputs, order writes, stock decrement, loyalty redeem, and cart deletion all
belong to one transaction.

## Loyalty lifecycle

| Event | Ledger |
|-------|--------|
| Create with points | `REDEEM` (negative) + debit `loyaltyPointsBalance` |
| Cancel / delete `PENDING` | `ADJUST` CREDIT equal to redeemed amount (idempotent; original `REDEEM` kept) |
| Status → `COMPLETED` | `EARN` = `floor(order.total) * LOYALTY_EARN_RATE` (rate = 1); idempotent |

Applying loyalty as a money discount on order totals is still TODO.

## Inventory lifecycle

| Event | Stock |
|-------|--------|
| Create | `ORDER_DECREMENT` per product |
| Cancel / delete `PENDING` | `ORDER_RESTORE` (idempotent) |
| Status → `COMPLETED` | none (already decremented) |

See [inventories.md](inventories.md).

## Status transitions

`utils/order-status.util.ts`:

| From | Allowed next |
|------|----------------|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `COMPLETED` |
| `COMPLETED` / `CANCELLED` | (none) |

Delete allowed only for `PENDING`.

## Money & snapshots in responses

Order totals and each `orderItems[].unitPrice` are fixed 2-decimal **strings**.

Response includes live `address` / `branch` relations when present, plus denormalized address columns snapshotted at checkout.

## Auth

App routes scope by JWT `sub`. Dashboard list/get/status need `orders:manage`
and are not filtered by the staff user's id. Loyalty earn/refund still uses
`order.userId`.
