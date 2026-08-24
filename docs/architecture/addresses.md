# Addresses

Saved delivery addresses for the authenticated user. Scoped to JWT `sub` — no cross-user access.

## Module graph

```
AddressesModule
  → PrismaService
```

`AddressesService` is `@Injectable({ scope: Scope.REQUEST })`.
Identity: `request.user.sub`.

Scratch: `src/modules/addresses/addresses.endpoint.http`.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/app/addresses` | Create address for current user |
| `GET` | `/app/addresses` | List current user's addresses |
| `GET` | `/app/addresses/:id` | Get one owned by current user → `404` if missing/other user's |
| `PATCH` | `/app/addresses/:id` | Update owned address |
| `DELETE` | `/app/addresses/:id` | Delete owned address |

## Fields

`line1`, optional `line2`, `city`, `state`, `zip`, `country`, `latitude`, `longitude`.

## Checkout use

`OrdersService` / cart validate require `addressId` when `type` is `DELIVERY` and reject it for other types. At checkout the address is **snapshotted** onto the order (`addressLine1`, city, etc.) and linked via `addressId`. See [orders.md](orders.md).

## Cascade

`Address.user` uses `onDelete: Cascade`. User hard-delete removes addresses; addresses do **not** block account deletion (only cart / orders do — see [users.md](users.md)).
