# Appointment Scheduler

Mobile-first booking app built with SvelteKit, Drizzle ORM, SQLite/Turso, and Resend.

## Local setup

Requires Node.js 22 and pnpm 10.

```bash
pnpm install
cp .env.example .env
```

Configure `.env`:

| Variable                  | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_CONNECTION_URL` | `file:local.db` locally; remote libSQL/Turso URL in production.           |
| `DATABASE_AUTH_TOKEN`     | Required for remote databases.                                            |
| `MAILER`                  | Resend API key.                                                           |
| `RATE_LIMIT_HASH_SECRET`  | Random secret of at least 32 characters.                                  |
| `CRON_SECRET`             | Production cleanup secret; use a separate random value of 32+ characters. |

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Migrations

After editing `src/lib/server/db/schema.ts`:

```bash
pnpm db:generate
pnpm test:migrations
pnpm db:migrate
```

## License

[MIT](./LICENSE).
