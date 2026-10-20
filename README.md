# TripaHolidays Express.js API

Express.js + MySQL conversion of the uploaded TripaHolidays Spring Boot backend. It retains the existing API path families (`/api/auth`, `/api/packages`, `/api/destinations`, `/api/bookings`, `/api/contacts`, `/api/offers`, `/api/reviews`, `/api/videos`, `/api/users`, and `/api/mail`) while replacing Java/Spring components with Node.js middleware, controllers, MySQL queries, JWT, bcrypt, and Nodemailer.

> **Security note:** the uploaded Spring configuration contained database and SMTP credentials. Those values have intentionally not been copied into this project. Rotate any credentials that were real, and use environment variables/secrets in the deployment environment.

## Stack

- Node.js 20+
- Express 4
- MySQL 8 / `mysql2`
- JWT (`jsonwebtoken`) and bcrypt password hashing
- `helmet`, CORS allow-list, rate limiting, and centralized errors
- Nodemailer (optional SMTP configuration)
- Swagger UI at `/api/docs` with the OpenAPI document at `/api/openapi.json`
- OpenTelemetry request metrics scraped by Prometheus and provisioned in Grafana
- Docker Compose for local API, database, Prometheus, and Grafana

## Quick start (local)

1. Install Node.js 20+ and MySQL 8.
2. Create a database and a restricted application user, then run `database/schema.sql` against that database. The supplied schema defaults to `tripDbExpress`.
3. Copy `.env.example` to `.env` and set the DB values, a strong `JWT_SECRET` (at least 32 random characters), and your frontend origins.
4. Install dependencies and start the API:

   ```bash
   npm install
   npm run start
   ```

5. Check `http://localhost:8085/health` and `http://localhost:8085/api/docs`.
6. To create an administrator, set `SEED_ADMIN=true`, a strong `ADMIN_PASSWORD` (12+ characters), and run `node src/scripts-seed-admin.js` once. Set `SEED_ADMIN=false` afterwards.

The API uses port `8085` by default to match the Spring Boot service port in the uploaded project.

## Docker Compose

1. Copy `.env.example` to `.env`.
2. Set `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `CORS_ORIGINS`, and (if seeding) `ADMIN_PASSWORD`.
3. Start services:

   ```bash
   docker compose up --build -d
   docker compose logs -f api
   ```

The bundled Compose setup uses the default database name `tripDbExpress`; if you change `DB_NAME`, also update the database initialization script/schema so the database name remains consistent.

Prometheus is available at `http://localhost:9090`, and Grafana at `http://localhost:3000` (default local login: `admin` / `admin`, unless `GRAFANA_ADMIN_PASSWORD` is set). The **TripaHolidays API** dashboard is provisioned automatically. Set a strong `GRAFANA_ADMIN_PASSWORD` before exposing Grafana beyond local development. The API's OpenTelemetry Prometheus exporter is reachable only by other Compose services on port `9464`; Prometheus scrapes it every 15 seconds.

## API endpoints

All paths below are relative to the API host.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/destinations` | Public | List destinations |
| GET | `/api/destinations/:id` | Public | Destination detail |
| POST/PUT/DELETE | `/api/destinations` and `/:id` | Admin | Manage destinations |
| GET | `/api/packages` | Public | List packages |
| GET | `/api/packages/:id` | Public | Package detail |
| POST/PUT/DELETE | `/api/packages` and `/:id` | Admin | Manage packages |
| POST | `/api/bookings` | Public | Create booking request |
| GET | `/api/bookings`, `/api/bookings/:id` | Admin | List/view bookings |
| PUT | `/api/bookings/:id/status` | Admin | Update booking status |
| DELETE | `/api/bookings/:id` | Admin | Delete booking |
| POST | `/api/contacts` | Public | Submit contact message |
| GET | `/api/contacts` | Admin | List contact messages |
| PUT | `/api/contacts/:id/read` | Admin | Mark contact as read |
| GET | `/api/offers` | Public | List offers |
| GET | `/api/reviews?packageId=1` | Public | List reviews |
| POST/PUT/DELETE | `/api/reviews` and `/:id` | Authenticated | Create/manage own reviews (admin can manage any) |
| GET | `/api/videos` | Public | List video entries |
| GET | `/api/users` | Admin | List users (password hashes are never returned) |
| POST | `/api/mail/send` | Admin | Send email (SMTP optional) |
| POST | `/api/mail/send-bulk` | Admin | Send email to up to 100 recipients |
| GET | `/health` | Public | Health check |
| GET | `/api/docs` | Public | Swagger UI |

Mutating administrative routes require `Authorization: Bearer <JWT>`. This is intentionally safer than the uploaded Spring Security configuration, which currently permits all `/api/**` routes despite commented-out role restrictions. If the frontend previously relied on unauthenticated admin operations, update it to send the admin JWT.

## Authentication examples

Register:

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Demo User","email":"demo@example.com","password":"use-a-strong-password","phone":"+91 9000000000"}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"admin@example.com","password":"your-admin-password"}
```

Response shape:

```json
{
  "token": "<JWT>",
  "role": "admin",
  "user": { "id": 1, "name": "Trip Admin", "email": "admin@example.com", "phone": null, "joined": "2026-10-18", "role": "admin" }
}
```

Use `Authorization: Bearer <JWT>` for protected routes.

## Environment variables

See `.env.example`. Never commit `.env`. In production, use a managed secrets store, restrict DB network access, configure exact frontend origins, use a strong JWT secret, and configure SMTP only if needed.

## Existing database / data migration

This project creates a **new schema** and does not automatically migrate data from the Spring Boot database. Back up the original database before migration. Compare existing table definitions, export data, map JPA join/collection tables (`package_images`, `package_included`, `package_excluded`, `package_tour_plan`) into the new JSON fields (`images`, `included`, `excluded`, `tourPlan`), then validate record counts and representative API responses before switching the frontend. Do not point this new API at the original database without checking schema compatibility.

## Frontend integration checklist

- Set the frontend API base URL to the Express API host and keep `/api` paths unchanged.
- Send the JWT for admin actions and review creation/editing.
- Check CORS origins for local and deployed frontend domains.
- Test package arrays (`images`, `included`, `excluded`, `tourPlan`) because the converted schema stores these as JSON columns.
- Test booking and contact submissions, error response handling, and admin workflows against the deployed API.

## Production readiness

Before a real launch, add automated integration tests against a disposable MySQL database, structured logging/monitoring, backup-and-restore verification, request validation schemas, and a reviewed migration from existing data. The conversion is a functional starter that must be tested with your actual frontend and data before replacing the current service.
