# شاپت (Shopet)

فروشگاه اینترنتی غذا و لوازم حیوانات خانگی — a Persian (RTL) online shop for pet supplies.

| Layer | Tech |
|---|---|
| Backend | Java 21, Spring Boot 4.1, Spring Security (JWT), Spring Data JPA, Flyway |
| Database | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, MUI (RTL), TanStack Query, Vazirmatn font |
| Runtime | Docker Compose (db, backend, nginx frontend) |
| Tests | JUnit + Testcontainers, Vitest + Testing Library, Playwright |

The full design (data model, API, order lifecycle, payment SPI) is in [docs/DESIGN.md](docs/DESIGN.md).

## Features

- Catalog by pet type (سگ، گربه، پرنده، ماهی، جوندگان، خزندگان) and category, search (Persian/Arabic keyboard
  aware), price/stock/discount filters and sorting
- Mobile number + one-time code login (SMS sender is pluggable; demo mode shows the code on screen)
- Guest cart in the browser that is merged into the account on login
- Checkout with saved addresses, discount coupons, free shipping over 1,000,000 Toman
- Stock reserved with row locks when the order is placed; unpaid orders are cancelled after 30 minutes
- Pluggable payment gateway with a **mock bank page** (Zarinpal-style redirect → callback → verify)
- Order tracking, wishlist, reviews & ratings (buyers only)
- Admin panel: dashboard, products with image upload, categories, order workflow, coupons, users, reviews
- Prices in Toman with Persian digits, dates in the Jalali calendar

## Quick start

```bash
cp .env.example .env   # optional: adjust secrets and ports
docker compose up -d --build
```

- Shop: http://localhost:8088
- API (direct): http://localhost:8089/api

**Admin login:** mobile `09120000000` (configurable with `ADMIN_PHONE`). In demo mode (`OTP_EXPOSE_CODE=true`)
the verification code is shown on the login page; it is also written to the backend log.

**Demo photos:** the home page banner and the 30 demo products use photos from Unsplash (free license, sources in
`frontend/src/assets/SOURCES.txt` and `backend/src/main/resources/seed-images/SOURCES.txt`); product photos are copied into the uploads volume on first start.

**Demo coupons:** `WELCOME10` (10%, max 200,000 Toman) and `PET50` (50,000 Toman off orders over 500,000).

### Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `shopet` / `shopet` / `shopet_secret` | Database |
| `JWT_SECRET` | empty | Token signing key (at least 32 characters). Empty = random key per start, so users log in again after restarts. **Set it in production.** |
| `ADMIN_PHONE` | `09120000000` | Mobile number promoted to admin at startup |
| `OTP_EXPOSE_CODE` | `true` in compose, `false` otherwise | Demo mode: return the OTP in the API response. **Anyone can then log in as any number, including the admin** — turn it off for real users |
| `SEED_DEMO_DATA` | `true` | Insert demo categories, products and coupons into an empty database |
| `WEB_PORT` / `API_PORT` | `8088` / `8089` | Published ports (the API port only on 127.0.0.1) |

The backend logs a warning at startup for every demo-only setting that is active (exposed OTP codes, no SMS
provider, mock payment gateway).

## Development

Backend (needs Docker for the test database):

```bash
cd backend
./mvnw test                     # unit + integration tests (Testcontainers, PostgreSQL 16)
./mvnw spring-boot:test-run     # run locally against a throw-away PostgreSQL container
```

Frontend (Node 20+):

```bash
cd frontend
npm install
VITE_API_PROXY=http://localhost:8089 npm run dev   # http://localhost:5173, proxies /api to the backend
npm test
```

End-to-end tests against the running compose stack (uses the installed Google Chrome; or run
`npx playwright install chromium` and set `PW_CHANNEL=chromium`):

```bash
cd e2e
npm install
npx playwright test
```

Run everything (backend, frontend, compose stack, E2E): `./scripts/test-all.sh`

## Plugging in a real payment gateway or SMS provider

- Payment: implement `ir.shopet.payment.PaymentGateway` (initiate → redirect URL, verify on callback) as a Spring
  bean and set `app.payment.gateway` to its `name()`. Set `APP_PUBLIC_URL` so callback URLs are absolute.
- SMS: provide a `ir.shopet.auth.SmsSender` bean (e.g. Kavenegar) marked `@Primary`, and set `OTP_EXPOSE_CODE=false`.

## Project structure

```
backend/    Spring Boot API (ir.shopet.*), Flyway migrations, Dockerfile
frontend/   React SPA, nginx config, Dockerfile
e2e/        Playwright end-to-end tests
docs/       Design document
```
