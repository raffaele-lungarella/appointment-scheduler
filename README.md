# Barber Shop Application

Lightweight, mobile-first booking system for barber shops built with SvelteKit, Drizzle ORM, SQLite, and Resend for email notifications.

## Getting started

The project uses Node.js 22 (see `.nvmrc`) and pnpm 10.

Install dependencies:

```bash
pnpm install
```

Create a `.env` file for local development:

```bash
cp .env.example .env
```

Environment variables:

| Variable                  | Required | Description                                                                                                  |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_CONNECTION_URL` | Yes      | SQLite (`file:local.db`) or remote libSQL/Turso database URL.                                                |
| `DATABASE_AUTH_TOKEN`     | Remote   | Authentication token required for a remote database; leave empty for a local `file:` database.               |
| `MAILER`                  | Yes      | Resend API key used for account and reservation emails.                                                      |
| `CRON_SECRET`             | Prod     | Authenticates Vercel requests to `/api/internal/cleanup`; use a cryptographically random value of 32+ chars. |
| `RATE_LIMIT_HASH_SECRET`  | Yes      | HMAC-hashes rate-limit identifiers; must be a random 32+ character value distinct from `CRON_SECRET`.        |
| `LOG_LEVEL`               | No       | Pino log level; defaults to `debug` in development, `info` in production, and `silent` in tests.             |
| `BASE_URL`                | No       | Base URL used by Playwright; defaults to `http://localhost:5173`.                                            |

Links included in emails use the origin of the incoming request automatically. Never commit `.env`; configure production values in the Vercel Production environment.

Prepare the database and start the development server:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Database migrations

The database is managed with Drizzle ORM and Drizzle Kit. The schema lives in `src/lib/server/db/schema.ts`; generated SQL migrations and their metadata are committed under `migrations/`.

After changing the schema, generate and review a migration:

```bash
pnpm db:generate
pnpm db:migrate
```

Useful database commands:

| Command            | Purpose                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Generate a SQL migration from schema changes.                                          |
| `pnpm db:migrate`  | Apply pending migrations to the configured database.                                   |
| `pnpm db:push`     | Push the schema directly without generating a migration; useful for local prototyping. |
| `pnpm db:studio`   | Open Drizzle Studio for the configured database.                                       |

The Drizzle configuration reads `.env`. A `DATABASE_CONNECTION_URL` beginning with `file:` uses local SQLite; any other URL is treated as a remote Turso database and also requires `DATABASE_AUTH_TOKEN`.

Production builds and database migrations are intentionally separate.

Do not put migration execution in Vercel's build command. Apply migrations once from a controlled deployment/release job before directing traffic to a release that requires them.

## Production releases

Vercel Git deployments are disabled in `vercel.json`. Production releases are manual and always deploy the latest commit from `main`:

1. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions secrets.
2. In GitHub, open **Actions → Release to production → Run workflow**.
3. Apply any required database migrations separately before releasing code that depends on them.

The workflow uses the GitHub `production` environment. Configure required reviewers for that environment if releases should require an approval step.

## Scheduled cleanup on Vercel

`vercel.json` invokes `GET /api/internal/cleanup` daily at 03:00 UTC. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is configured for the project.

Deployment requirements:

1. Generate independent long random values and add `CRON_SECRET` and `RATE_LIMIT_HASH_SECRET` to the Vercel Production environment.
2. Ensure `DATABASE_CONNECTION_URL` and, for remote Turso, `DATABASE_AUTH_TOKEN` are available to the Production runtime.
3. Deploy `vercel.json` with the application and confirm the cron appears in the Vercel project dashboard.
4. For a manual smoke test, send `GET /api/internal/cleanup` with the same bearer header. A successful response contains per-category deletion counts; a partial or complete cleanup failure returns HTTP 500 with a `failures` array.

Cleanup operations are idempotent, but the categories are executed as separate database operations rather than one cross-table transaction. The response therefore reports partial progress accurately and does not claim cross-table atomicity. The existing authenticated admin clean action continues to call the same cleanup service.

CI has explicit quality/build, unit-test, integration-test, and dependency-audit jobs. E2E is intentionally not part of CI until its server, database, and browser setup can run reliably in isolation.

## License

This project is licensed under the [MIT license](./LICENSE).
