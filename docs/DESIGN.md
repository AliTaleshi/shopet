# Shopet (شاپت) — Design

Persian (RTL) online shop for pet supplies: food, toys, accessories, health and
hygiene products for dogs, cats, birds, fish, small pets and reptiles.

## 1. Decisions

| Topic | Decision |
|---|---|
| Backend | Java 21, Spring Boot 4.1, Spring MVC, Spring Data JPA (Hibernate), Spring Security (JWT resource server), Flyway |
| Database | PostgreSQL 16 |
| Frontend | React 19 + TypeScript, Vite, MUI (RTL via `stylis-plugin-rtl`), TanStack Query, React Router, Vazirmatn font |
| Auth | Mobile number + one-time code (OTP). SMS sending is behind `SmsSender`; the default implementation logs the code (and in dev mode returns it to the UI) |
| Payment | Pluggable `PaymentGateway` interface; a **mock gateway** is implemented now (simulated bank page → callback), modelled after Zarinpal's redirect/verify flow so a real gateway can be dropped in |
| Extras | Reviews & ratings, wishlist, discount coupons, admin image upload |
| Money | Integer **Toman** (`BIGINT`), formatted with Persian digits in the UI |
| Dates | Stored as `timestamptz` (UTC); displayed in the **Jalali** calendar (`Intl` `fa-IR`) |
| Deployment | `docker compose`: `db` (postgres:16), `backend`, `frontend` (nginx serving the SPA and proxying `/api`) |
| Tests | Backend: JUnit 5 + MockMvc + Testcontainers (real PostgreSQL 16). Frontend: Vitest + Testing Library. Whole system: Playwright E2E against the compose stack |

## 2. Architecture

```
 Browser ──► frontend (nginx :8088)
               ├── /            → React SPA (static)
               └── /api/*       → backend (Spring Boot :8080, exposed as :8089)
                                     ├── PostgreSQL 16 (db:5432)
                                     └── /app/uploads (docker volume, product images)
```

Same-origin in production (nginx proxy), so no CORS is needed; in development
Vite proxies `/api` to the backend.

### Backend package layout (`ir.shopet`)

```
config/        security, JWT, properties, web config
common/        error handling (ApiException, ProblemDetail), paging DTO, utils
auth/          OTP request/verify, JWT issuing, SmsSender
user/          User entity, profile, addresses
catalog/       Category, Product, ProductImage, search/filter specs
storage/       FileStorageService (local disk volume)
cart/          server-side cart
wishlist/
review/
coupon/        coupon rules & discount calculation
order/         checkout, orders, stock reservation, expiry job
payment/       PaymentGateway SPI, MockPaymentGateway, callback controller
admin/         admin-only controllers (dashboard, CRUD)
seed/          demo data + admin user bootstrap
```

## 3. Data model

```
users(id, phone UNIQUE, full_name, role[CUSTOMER|ADMIN], created_at)
otp_codes(id, phone, code_hash, expires_at, attempts, consumed, created_at)
addresses(id, user_id→users, title, receiver_name, receiver_phone, province, city,
          postal_code, address_line, created_at)

categories(id, name, slug UNIQUE, description, sort_order)
products(id, name, description, brand, pet_type[DOG|CAT|BIRD|FISH|SMALL_PET|REPTILE],
         category_id→categories, price, discount_price NULL, stock, active,
         rating_avg, rating_count, sold_count, created_at, updated_at)
product_images(id, product_id→products, file_name, sort_order)

cart_items(id, user_id, product_id, quantity, UNIQUE(user_id, product_id))
wishlist_items(id, user_id, product_id, created_at, UNIQUE(user_id, product_id))
reviews(id, product_id, user_id, rating 1..5, comment, created_at, UNIQUE(product_id, user_id))

coupons(id, code UNIQUE, type[PERCENT|FIXED], value, min_order_amount, max_discount NULL,
        usage_limit NULL, used_count, expires_at NULL, active, created_at)

orders(id, user_id, status, items_total, discount_amount, shipping_cost, total,
       coupon_id NULL→coupons, coupon_code NULL, receiver_name, receiver_phone, province, city, postal_code,
       address_line, created_at, updated_at, paid_at NULL)
order_items(id, order_id, product_id, product_name, unit_price, quantity)
payments(id, order_id, gateway, amount, authority UNIQUE, status[INITIATED|SUCCESS|FAILED],
         ref_id NULL, created_at, completed_at NULL)
```

The order keeps a **snapshot** of the shipping address, product names and prices
so later edits don't change history.

### Order lifecycle

```
PENDING_PAYMENT ──pay ok──► PAID ──admin──► PROCESSING ──► SHIPPED ──► DELIVERED
      │
      ├── user cancels / unpaid for 30 min (scheduled job) ──► CANCELLED (stock restored)
      └── payment failed → stays PENDING_PAYMENT, user may retry
PAID / PROCESSING ──admin──► CANCELLED (stock restored)
```

Stock is **reserved** (decremented) when the order is created, under a
pessimistic row lock to prevent overselling. A coupon use is reserved at the same
time (under a row lock on the coupon, so usage limits hold under concurrency) and
given back if the order is cancelled. Checkout also locks the user row, so a
double-submitted order can't reserve stock twice.

Unpaid orders are cancelled after 30 minutes, except while a payment started in
the last 15 minutes is still open (the customer may be on the bank page).
Concurrent gateway callbacks are serialized by locking the payment row.

### Pricing rules

- Effective unit price = `discount_price` if set, otherwise `price`.
- Coupon: `PERCENT` (capped by `max_discount`) or `FIXED`; requires
  `items_total >= min_order_amount`, active, not expired, usage limit not reached.
- Shipping: 50,000 Toman; free when items total (after discount) ≥ 1,000,000 Toman
  (both configurable). A coupon that covers every item doesn't waive shipping; an
  order whose total is still 0 is marked paid without going to the gateway.

## 4. Authentication

1. `POST /api/auth/otp/request {phone}` — validates Iranian mobile format
   (`09xxxxxxxxx`), throttles to 1 code / 60 s per phone, stores a BCrypt hash of
   a 5-digit code valid for 2 minutes, sends it through `SmsSender`.
2. `POST /api/auth/otp/verify {phone, code}` — max 5 attempts per code; creates the
   user on first login; returns a signed JWT (HS256, 7 days) + user profile +
   `newUser` flag (UI then asks for the full name).
3. Roles: `CUSTOMER`, `ADMIN`. The phone in `ADMIN_PHONE` is promoted to admin at startup.
4. Requests and verifications for one number are serialized with a PostgreSQL
   advisory lock, so parallel guesses can't exceed the attempt limit. Old codes are
   deleted hourly, and nginx limits `/api/auth/` to 60 requests/minute per IP.
5. Tokens are signed with `JWT_SECRET`; if it is unset (or the `.env.example`
   placeholder) a random key is generated at startup instead of a guessable default.
   The `iss` claim is validated.

## 5. REST API (prefix `/api`)

Public
- `GET  /categories`
- `GET  /products?q&categoryId&petType&minPrice&maxPrice&inStock&discounted&sort&page&size`
  (sort: `newest|price_asc|price_desc|popular|rating`)
- `GET  /products/{id}`, `GET /products/{id}/reviews`
- `GET  /files/{name}` — product images
- `POST /auth/otp/request`, `POST /auth/otp/verify`

Customer (JWT)
- `GET/PUT /me`, `GET/POST/PUT/DELETE /me/addresses[/{id}]`
- `GET /cart`, `PUT /cart/items/{productId} {quantity}`, `DELETE /cart/items/{productId}`,
  `POST /cart/merge {items}` (guest cart merged after login), `DELETE /cart`
- `GET /wishlist`, `GET /wishlist/ids`, `PUT /wishlist/{productId}`, `DELETE /wishlist/{productId}`
- `POST /products/{id}/reviews` — only for buyers (product in a paid order)
- `POST /checkout/preview {couponCode}` — totals for the current cart
- `POST /orders {addressId, couponCode}`, `GET /orders`, `GET /orders/{id}`,
  `POST /orders/{id}/cancel`, `POST /orders/{id}/pay` → `{redirectUrl}`

Payment
- `GET /payments/mock/{authority}` — simulated bank page (HTML)
- `GET /payments/callback?authority&status` — verifies, then redirects to
  `/payment/result?orderId&status` on the frontend

Admin (`ADMIN` role)
- `GET /admin/dashboard`
- `GET/POST/PUT/DELETE /admin/products`, `POST /admin/products/{id}/images` (multipart),
  `DELETE /admin/products/{id}/images/{imageId}`
- `GET/POST/PUT/DELETE /admin/categories`
- `GET /admin/orders?status`, `GET /admin/orders/{id}`, `PUT /admin/orders/{id}/status`
- `GET/POST/PUT/DELETE /admin/coupons`
- `GET /admin/users`
- `GET /admin/reviews`, `DELETE /admin/reviews/{id}`

Errors use RFC 7807 `ProblemDetail` with a Persian `detail` message and, for
validation errors, a field → message map.

## 6. Payment SPI

```java
interface PaymentGateway {
  String name();
  InitResult initiate(Payment payment, String callbackUrl);   // → redirect URL + authority
  VerifyResult verify(Payment payment, Map<String,String> callbackParams);
}
```

`MockPaymentGateway` redirects to the backend-rendered simulated bank page with
"پرداخت موفق" / "انصراف از پرداخت" buttons that hit the callback exactly like a
real gateway would. The active gateway is chosen by `app.payment.gateway`.

## 7. Frontend pages

Shop: home (hero, pet types, categories, discounted & new products) · product
list with filters/sort/search/pagination · product detail (gallery, add to cart,
wishlist, reviews) · cart (works for guests, merged on login) · login (phone →
code) · checkout (address, coupon, summary, pay) · payment result ·
profile (orders, order detail, addresses, wishlist, account).

Admin (`/admin`): dashboard · products (+ image upload) · categories · orders
(status changes) · coupons · users · reviews.

UI: MUI with `direction: rtl`, Vazirmatn, Persian digits and Toman formatting,
Jalali dates, responsive (mobile drawer navigation).

## 8. Docker & configuration

`docker-compose.yml` services: `db` (postgres:16, volume `pgdata`, healthcheck),
`backend` (multi-stage Maven → JRE 21, volume `uploads`, waits for healthy db),
`frontend` (multi-stage Node → nginx). Configuration via `.env`
(`POSTGRES_*`, `JWT_SECRET`, `ADMIN_PHONE`, `OTP_EXPOSE_CODE`, `SEED_DEMO_DATA`, ports).

## 9. Testing strategy

- **Backend**: unit tests for pricing/coupon logic; integration tests with
  Testcontainers PostgreSQL 16 covering auth, catalog filtering, cart, checkout,
  stock reservation, coupons, payment callback, reviews permissions, admin access.
- **Frontend**: Vitest + Testing Library for formatting utils, cart logic and key components.
- **E2E**: Playwright drives the full docker-compose stack: browse → add to cart
  → login with OTP → checkout with coupon → mock payment → order visible; admin
  creates a product and changes order status.
