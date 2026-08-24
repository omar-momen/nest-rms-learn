# Loyalty transactions

Points ledger for the current user. Same pattern as inventory: cached balance
on `User.loyaltyPointsBalance`, append-only `LoyaltyTransaction` with a
**signed** `points` delta.

There is **no** customer `POST`. Earn / redeem / refund happen only from
`OrdersService` inside the checkout / complete / cancel transaction.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/app/loyalty-transactions` | Caller's ledger, newest first |
| `GET` | `/app/loyalty-transactions/balance` | `{ balance }` from `loyaltyPointsBalance` |
| `GET` | `/app/loyalty-transactions/:id` | One row owned by the caller |

Scratch: `src/modules/loyalty-transactions/loyalty-transactions.endpoint.http`.

`LoyaltyTransactionsService` is request-scoped (`request.user.sub`).
Register `balance` **before** `:id`.

## Signed points

Order hooks pass a positive magnitude; the service stores the sign:

| Type | Sign | Writer |
|------|------|--------|
| `EARN` | `+` | `earnInTx` on `COMPLETED` |
| `REDEEM` | `-` | `redeemInTx` at checkout |
| `ADJUST` CREDIT | `+` | `refundRedeemInTx` on cancel/delete |

`applyDeltaInTx` (private) locks the user row, rejects `next < 0`, updates the
balance, then inserts the ledger row.

## Order hooks

Called from `OrdersService` with the existing `tx`:

| Event | Method |
|-------|--------|
| Checkout with `loyaltyPointsAmount > 0` | `redeemInTx` |
| Cancel / delete `PENDING` / status `CANCELLED` | `refundRedeemInTx` (`ADJUST` credit; idempotent) |
| Status → `COMPLETED` | `earnInTx` = `floor(order.total) * LOYALTY_EARN_RATE` (rate = 1; idempotent) |

Loyalty is **not** yet subtracted from order money totals (TODO). See
[orders.md](orders.md) and `GET /app/users/me` (`loyaltyPointsBalance`).
