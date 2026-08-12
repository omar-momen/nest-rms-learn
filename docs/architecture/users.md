# Users

The customer-facing users API exposes only the authenticated account. There is
no public or authenticated-by-default admin CRUD surface.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/users/me` | Return the caller identified by JWT `sub` |
| `PATCH` | `/users/me` | Update email and/or password; passwords are hashed before persistence |
| `DELETE` | `/users/me` | Hard-delete only when no cart or orders exist |

Scratch: `src/modules/users/users.endpoint.http`.

## Identity and password invariant

`UsersService` is request-scoped and reads `request.user.sub`. A password is
never persisted directly from a DTO: both internal `update` and `updateMe`
replace a supplied plaintext password with `hashPassword(password)`.

When a password is changed, `AuthService.revokeOtherSessionFamilies` runs so
other refresh families cannot keep issuing access tokens after a compromise.
The caller's family (from the access JWT `familyId`) is kept. Revoked families
also fail the access-token session lookup immediately.

## Deletion policy

Account deletion is deliberately conservative:

1. Lock the `User` row with `FOR UPDATE`
2. Count carts and orders in the same transaction
3. If either exists, reject with `400`
4. Otherwise hard-delete the user

The row lock prevents a concurrent checkout from racing the dependency check.
Sessions and addresses use `onDelete: Cascade`, so eligible deletion also
removes those rows (and invalidates outstanding access JWTs on the next
request). Addresses alone do not block deletion.

Why not soft delete yet: a correct soft-delete design also needs disabled-user
checks during login and access-token validation, email uniqueness/re-registration
rules, retention decisions, and anonymization. Adding only `deletedAt` would
create an account that still has a valid access JWT and would not be a complete
deletion policy.

Why carts also block deletion: this follows the current project rule. If product
requirements later define carts as disposable during account deletion, change
the policy explicitly and delete the cart inside the same transaction.
