# Auth

JWT access tokens (Bearer header) + opaque refresh tokens (httpOnly cookie) backed by a `Session` row.

## Module graph

```
AuthModule
  → PrismaService (via global PrismaModule)
  → APP_GUARD AccessTokenGuard   (JWT + active session family unless @Public)
  → APP_GUARD PermissionsGuard   (role → permissions; skip if @Public or no metadata)

JwtModule is registered globally in AppModule, not imported here.
```

Scratch: `src/modules/auth/auth.endpoint.http`.

## Token model

| Token | Where | Lifetime | Storage |
|-------|--------|----------|---------|
| Access | `Authorization: Bearer …` response body | short (`JWT_ACCESS_EXPIRES_IN`, e.g. `15m`) | signed JWT (`sub`, `username`, `familyId`); validity also requires an active `Session` for that family |
| Refresh | httpOnly cookie `refreshToken`, `path=/auth` | longer (`JWT_REFRESH_EXPIRES_IN`, e.g. `7d`) | only **SHA-256 hash** in `Session.refreshTokenHash`; rotations share `familyId` |
| Password reset | request body (then discarded) | short (`PASSWORD_RESET_EXPIRES_IN`, e.g. `15m`) | only **SHA-256 hash** on `User.passwordResetOtpHash`; single-use |

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
  → attaches payload + DB `role` to request.user

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
| `POST` | `/auth/forgot-password` | `@Public` | issue 6-digit OTP; same message whether the email exists (no enumeration) |
| `POST` | `/auth/reset-password` | `@Public` | consume OTP + email → new password; revoke **all** session families |

Access token is returned in JSON; refresh never leaves the cookie (browser clients).

## Current identity in domain services

Carts / orders / users resolve the caller via `@Inject(REQUEST)` → `request.user.sub` (JWT `sub`), with `@Injectable({ scope: Scope.REQUEST })`.
`request.user.role` is loaded from the DB during the session lookup (not from the JWT), so a role change applies on the next request.

## Surfaces and authorization

Same `/auth` login. Routes are split by prefix:

| Prefix | Decorator | Required permission |
|--------|-----------|---------------------|
| `/app/…` | `@AppController('…')` | `app:access` (every role) |
| `/dashboard/…` | `@DashboardController('…')` | `dashboard:access` (`STAFF`, `ADMIN`) |
| `/auth`, `/health` | `@Public()` | none |

`User.role` is `CUSTOMER` (register default) | `STAFF` | `ADMIN`. Permissions live in code (`src/modules/auth/authorization/permissions.ts` + `ROLE_PERMISSIONS`). `PermissionsGuard` is a global `APP_GUARD` after `AccessTokenGuard`. Class + method `@RequirePermissions` are **merged** (write routes need `dashboard:access` and e.g. `products:write`).

Promote the first admin by hand (or later via `PATCH /dashboard/users/:id`):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Auth responses and `GET /app/users/me` include `role`. Account/role
management for other users is under `/dashboard/users` (`users:read` /
`users:write`, ADMIN only) — see [users.md](users.md).

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
- Password reset revokes **every** family → all access JWTs for that user die
- User delete cascades `Session` rows → every access JWT for that user dies
- Refresh reuse revokes the family → same effect

Tokens without `familyId` are rejected.

## Password change and sessions

`AuthService.revokeOtherSessionFamilies(userId, exceptFamilyId?)` marks active
`Session` rows revoked. `UsersService` calls it after a successful password
change (`PATCH /app/users/me/password` or a dashboard password update), passing
`request.user.familyId` so the current refresh family survives and every other
family is killed. Dashboard resets of another user omit `exceptFamilyId` and
revoke every family.

## Password reset

Forgot / reset live on `/auth` (public). `sendPasswordResetOtp` sends mail in
production only (stub until a provider is wired); non-production responses
include `otp` so the flow can be exercised locally.

```
POST /auth/forgot-password { email }
  → same message whether the user exists
  → if the user exists: 6-digit OTP, store SHA-256 hash + expiry on User
  → production: sendPasswordResetOtp(email, otp)
  → a new request overwrites any previous unused code

POST /auth/reset-password { email, otp, newPassword }
  → lookup user by email; verify OTP hash; reject if missing / expired
  → reject if newPassword matches the current password
  → atomically claim the OTP (clear hash + expiry) and hash the new password
  → revoke every active Session for that user
  → user must log in again
```

## Rate limiting

Global `ThrottlerGuard` plus named throttlers in `src/common/throttler/`.
Auth routes tighten further:

| Route | Notable limits |
|-------|----------------|
| `POST /auth/register` | IP 5/hour; email 3/hour (with block) |
| `POST /auth/login` | IP 20 / 15m; email 5 / 15m |
| `POST /auth/forgot-password` | IP 5/hour; email 3/hour (with block) |
| `POST /auth/reset-password` | IP 10 / 15m |
| `POST /auth/refresh` | IP 30 / minute |
| `POST /auth/logout` | `@SkipThrottle` (default + authEmail) |

See [overview.md](overview.md) for the app-wide defaults.
