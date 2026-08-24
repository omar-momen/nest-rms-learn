# Coupons

Catalog of discount codes. Applied at cart validate and order checkout via
`src/utils/cart-order-flow` (`assertCouponAvailable` + `calculateCartSummary`).
Not a child of an order — orders snapshot `couponCode` / `couponType` /
`couponValue` and keep an optional `couponId`.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/dashboard/coupons` | Create (`coupons:write`) |
| `GET` | `/dashboard/coupons` | List |
| `GET` | `/dashboard/coupons/:id` | Get one |
| `PATCH` | `/dashboard/coupons/:id` | Update (`coupons:write`) |
| `DELETE` | `/dashboard/coupons/:id` | Delete (`coupons:write`) |

Scratch: `src/modules/coupons/coupons.endpoint.http`.

Dashboard only (`DASHBOARD_ACCESS`).

## Checkout rules

Shared in `assertCheckoutFulfillment`: code must exist and be active, within
`startDate`/`expireDate`, meet `minOrderAmount`, and be under `usageLimit`.
Discount is capped by `maxDiscountAmount`. `usageCount` is incremented at
order create when a coupon is used.

Money fields in responses are 2-decimal strings.
