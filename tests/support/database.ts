import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDatabase } from "$lib/server/db/client";
import { migrate } from "drizzle-orm/libsql/migrator";

export async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "barber-shop-test-"));
  const url = `file:${join(directory, "test.sqlite")}`;
  const database = createDatabase(url);

  try {
    await migrate(database, { migrationsFolder: join(process.cwd(), "migrations") });
    await database.run("PRAGMA journal_mode = WAL");
    await database.run("PRAGMA foreign_keys = ON");
    await database.run("PRAGMA busy_timeout = 1000");
  } catch (error) {
    database.$client.close();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }

  return {
    database,
    async createClient() {
      const client = createDatabase(url);
      await client.run("PRAGMA foreign_keys = ON");
      await client.run("PRAGMA busy_timeout = 100");
      return client;
    },
    async cleanup() {
      database.$client.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
