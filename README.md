# Barber Shop Application

Lightweight, mobile-first booking system for barber shops built with SvelteKit, Drizzle ORM, SQLite, and Resend for email notifications.

## Getting started

The project uses Node.js 22 (see `.nvmrc`) and pnpm 10.

Install dependencies:

```bash
pnpm install
```

Create a `.env` file for local development:

```dotenv
DATABASE_CONNECTION_URL=file:local.db
DATABASE_AUTH_TOKEN=
BASE_URL=http://localhost:5173
MAILER=
CRON_SECRET=
RATE_LIMIT_HASH_SECRET=
```

`DATABASE_AUTH_TOKEN` is optional for a local `file:` database and required for a remote Turso database. `MAILER` is the Resend API token used for email notifications, while `BASE_URL` is used to build links included in those emails. `CRON_SECRET` authenticates the internal scheduled-cleanup endpoint. `RATE_LIMIT_HASH_SECRET` HMAC-hashes client addresses used by the database-backed abuse limiter. Both secrets must be independent, cryptographically random production values of at least 32 characters.

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

Production builds and database migrations are intentionally separate:

- `pnpm release` creates the production build and does not access or modify the database.
- `pnpm release:migrate` applies pending migrations and must be run as an explicit deployment step with production database credentials.

Do not put migration execution in Vercel's build command. Apply migrations once from a controlled deployment/release job before directing traffic to a release that requires them.

## Scheduled cleanup on Vercel

`vercel.json` invokes `GET /api/internal/cleanup` daily at 03:00 UTC. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is configured for the project.

Deployment requirements:

1. Generate independent long random values and add `CRON_SECRET` and `RATE_LIMIT_HASH_SECRET` to the Vercel Production environment.
2. Ensure `DATABASE_CONNECTION_URL` and, for remote Turso, `DATABASE_AUTH_TOKEN` are available to the Production runtime.
3. Deploy `vercel.json` with the application and confirm the cron appears in the Vercel project dashboard.
4. For a manual smoke test, send `GET /api/internal/cleanup` with the same bearer header. A successful response contains per-category deletion counts; a partial or complete cleanup failure returns HTTP 500 with a `failures` array.

Cleanup operations are idempotent, but the categories are executed as separate database operations rather than one cross-table transaction. The response therefore reports partial progress accurately and does not claim cross-table atomicity. The existing authenticated admin clean action continues to call the same cleanup service.

CI has explicit quality/build, unit-test, integration-test, and dependency-audit jobs. E2E is intentionally not part of CI until its server, database, and browser setup can run reliably in isolation.

> [!IMPORTANT]
> The application is ACTUALLY being used by Emiliano Lo Russo at **Emi Hair Club**. If you're near Siena, stop by for a cut :).

## License

This project is licensed under the [MIT license](./LICENSE).
