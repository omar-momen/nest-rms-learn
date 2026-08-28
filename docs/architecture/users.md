# Users

Two surfaces: customer self-service under `/app`, admin account management
under `/dashboard`.

## Module graph

```
UsersModule
  → AuthModule   (revoke session families on password change)
```

`UsersService` is `@Injectable({ scope: Scope.REQUEST })`.

## App endpoints (`APP_ACCESS`)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/app/users/me` | Caller by JWT `sub` (`role`, `loyaltyPointsBalance`) |
| `PATCH` | `/app/users/me` | Update own email |
| `PATCH` | `/app/users/me/password` | Change password (requires current); revoke other families |
| `DELETE` | `/app/users/me` | Hard-delete only when no cart or orders |

App `PATCH /me` cannot change `role` or password.

## Dashboard endpoints (`DASHBOARD_ACCESS` + permissions)

`users:read` / `users:write` are **ADMIN-only** (not on `STAFF`).

| Method | Path | Permission | Behavior |
|--------|------|------------|----------|
| `GET` | `/dashboard/users` | `users:read` | List all accounts |
| `GET` | `/dashboard/users/:id` | `users:read` | Get one |
| `PATCH` | `/dashboard/users/:id` | `users:write` | Update email / password / **role** |
| `DELETE` | `/dashboard/users/:id` | `users:write` | Same deletion policy as `/me` |

Scratch: `src/modules/users/users.endpoint.http`.

## Password + sessions

A password is never persisted from a DTO as plaintext — always `hashPassword`.

On password change (`PATCH /app/users/me/password`):

- Verify `currentPassword`; reject if it does not match or equals `newPassword`
- Hash `newPassword`, then revoke other families; keep caller `familyId`

Dashboard `PATCH` of **self** (incl. password) → revoke other families; keep caller `familyId`.
Dashboard `PATCH` of **another** user → revoke **all** of that user's families.

Forgot / reset (unauthenticated) lives under `/auth` — see [auth.md](auth.md).
A successful reset revokes **every** family; the user must log in again.

Role changes apply on the next request (`AccessTokenGuard` loads `role` from DB).

## Deletion policy

1. Lock the `User` row with `FOR UPDATE`
2. Count carts and orders in the same transaction
3. If either exists → `400`
4. Otherwise hard-delete (sessions/addresses cascade)

`loyaltyPointsBalance` is read-only on these routes; mutations go through
[loyalty-transactions.md](loyalty-transactions.md) / order hooks.
