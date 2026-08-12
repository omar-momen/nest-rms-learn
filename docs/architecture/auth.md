# Auth

JWT access tokens (Bearer header) + opaque refresh tokens (httpOnly cookie) backed by a `Session` row.

## Module graph

```
AuthModule
  → JwtModule (global)   (sign / verify access tokens)
  → PrismaService        (User lookup/create + Session rotation)
  → APP_GUARD AccessTokenGuard  (all routes require JWT unless @Public())
```

Scratch: `src/modules/auth/auth.endpoint.http`.

## Token model

| Token | Where | Lifetime | Storage |
|-------|--------|----------|---------|
| Access | `Authorization: Bearer …` response body | short (`JWT_ACCESS_EXPIRES_IN`, e.g. `15m`) | signed JWT (`sub`, `username`, `familyId`); validity also requires an active `Session` for that family |
| Refresh | httpOnly cookie `refreshToken`, `path=/auth` | longer (`JWT_REFRESH_EXPIRES_IN`, e.g. `7d`) | only **SHA-256 hash** in `Session.refreshTokenHash`; rotations share `familyId` |

```
Login / Register
  → issue access JWT (sub=userId, username=email, familyId)
  → generate random refresh token
  → store hash in Session (same familyId)
  → Set-Cookie refreshToken

Protected request
  → AccessTokenGuard verifies JWT signature + expiry
  → requires `familyId` claim
  → session lookup: active Session for (`sub`, `familyId`)
    (revokedAt null, expiresAt > now)
  → reject if missing (logout, family revoke, user delete, expired refresh)
  → attaches payload to request.user

POST /auth/refresh
  → read cookie → hash lookup Session
  → pre-sign the access token before mutating session state
  → transaction:
      → reject if missing / expired
      → atomically claim and revoke the current Session
      → create the replacement in the same family
  → if a revoked token is reused:
      → revoke every active Session in that family
      → reject with 401

POST /auth/logout
  → revoke Session if present → clear cookie
  → access JWT for that family fails on the next request (session lookup)
```

## Endpoints

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `POST` | `/auth/register` | `@Public` | create user → session; duplicate email → `400 Unable to register with the provided credentials` (no enumeration) |
| `POST` | `/auth/login` | `@Public` | verify password → session; missing user / bad password → `401 Invalid Credentials` |
| `POST` | `/auth/refresh` | `@Public` (cookie) | atomically rotate refresh → new access; family revoke on reuse |
| `POST` | `/auth/logout` | `@Public` (cookie) | revoke session → clear cookie |

Access token is returned in JSON; refresh never leaves the cookie (browser clients).

## Current identity in domain services

Carts / orders / users resolve the caller via `@Inject(REQUEST)` → `request.user.sub` (JWT `sub`), with `@Injectable({ scope: Scope.REQUEST })`.

There is **no** role / permission layer yet. Catalog modules (`/products`, `/categories`) are JWT-gated for any authenticated user.

## Rotation concurrency

The old session is claimed with a conditional `updateMany` (`revokedAt: null`,
`expiresAt > now`). If two refresh requests race, only one can claim it. The
loser is treated as token reuse and revokes active descendants in the family.

The family-revocation branch returns a status from the transaction and throws
`UnauthorizedException` only after commit. Throwing inside that branch would
roll back the security revocation.

`AuthService` performs credential lookup itself; it does not depend on the
request-scoped `UsersService`.

## Access token revocation

Access tokens are not denylisted by jti. Immediate invalidation is intentional
via **session-family lookup** in `AccessTokenGuard`:

- Logout revokes the current `Session` → access JWT for that `familyId` dies
- Password change / `revokeOtherSessionFamilies` revokes other families → their
  access JWTs die on the next request; the caller's family stays active
- User delete cascades `Session` rows → every access JWT for that user dies
- Refresh reuse revokes the family → same effect

Tokens without `familyId` are rejected.

## Password change and sessions

`AuthService.revokeOtherSessionFamilies(userId, exceptFamilyId?)` marks active
`Session` rows revoked. `UsersService` calls it after a successful password
update, passing `request.user.familyId` so the current refresh family survives
and every other family is killed.

## Rate limiting

Global `ThrottlerGuard` plus named throttlers in `src/common/throttler/`.
Auth routes tighten further:

| Route | Notable limits |
|-------|----------------|
| `POST /auth/register` | IP 5/hour; email 3/hour (with block) |
| `POST /auth/login` | IP 20 / 15m; email 5 / 15m |
| `POST /auth/refresh` | IP 30 / minute |
| `POST /auth/logout` | `@SkipThrottle` (default + authEmail) |

See [overview.md](overview.md) for the app-wide defaults.
