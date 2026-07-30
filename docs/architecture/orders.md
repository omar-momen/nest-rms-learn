# Orders

Checkout turns the current user's cart into an order, then deletes the cart (disposable cart). Order lines are created only at checkout — no public `/order-items` API.

## Module graph

```
OrdersModule
  (uses Prisma directly + carts utils: ownership, assess)
```

No `CartsModule` import: checkout loads/locks the cart inside one Prisma transaction.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/orders` | Lock cart → re-assess → create order + items → delete cart |
| `GET` | `/orders` | List orders for current user |
| `GET` | `/orders/:id` | Get one (404 if missing or not owned) |
| `PATCH` | `/orders/:id/status` | Allowed status transitions only |
| `DELETE` | `/orders/:id` | Only if status is `PENDING` |

Scratch: `src/modules/orders/orders.endpoint.http`.

## Checkout (`POST /orders`)

Inside `$transaction`:

1. `SELECT … FOR UPDATE` on the user's cart (and its items)
2. Ownership check
3. Reload cart + products; `assessCartItems` — fail → `400`
4. Compute totals with `Decimal` (`money.util`)
5. Create `Order` + `OrderItem`s (snapshot `unitPrice` from product)
6. Delete cart

Body may include optional `couponCode`, `loyaltyPointsAmount`, `address`, `paymentMethod` (validation/application still TODO).

## Status transitions

`utils/order-status.util.ts`:

| From | Allowed next |
|------|----------------|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `COMPLETED` |
| `COMPLETED` / `CANCELLED` | (none) |

Delete allowed only for `PENDING`.

## Money in responses

Order totals and each `orderItems[].unitPrice` are fixed 2-decimal **strings**.

## Auth note

User id from `DEV_CURRENT_USER_ID` until auth exists. Cart is resolved by that user id (not a hardcoded cart id).
