import * as table from "$lib/server/db/schema";
import { consumeRateLimit, type RateLimitPolicy } from "$lib/server/rate-limit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../support/database";

const policy: RateLimitPolicy = { id: "login", limit: 2, windowMs: 60_000 };
const hashSecret = "test-rate-limit-secret-at-least-32-characters";

describe("database rate limiter", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("atomically increments a fixed-window counter and returns retry timing", async () => {
    const now = new Date("2026-01-01T00:00:30.000Z");
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        consumeRateLimit("203.0.113.7", policy, {
          hashSecret,
          database: testDatabase.database,
          now,
        }),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(2);
    expect(results.filter((result) => !result.allowed)).toEqual([
      { allowed: false, remaining: 0, retryAfterSeconds: 30 },
    ]);

    const rows = await testDatabase.database.select().from(table.rateLimit);
    expect(rows).toHaveLength(1);
    expect(rows[0].requestCount).toBe(3);
    expect(rows[0].keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows[0])).not.toContain("203.0.113.7");
  });

  it("starts a fresh counter in the next window and separates policies", async () => {
    const firstWindow = new Date("2026-01-01T00:00:59.999Z");
    const nextWindow = new Date("2026-01-01T00:01:00.000Z");

    await consumeRateLimit("203.0.113.7", policy, {
      hashSecret,
      database: testDatabase.database,
      now: firstWindow,
    });
    const rollover = await consumeRateLimit("203.0.113.7", policy, {
      hashSecret,
      database: testDatabase.database,
      now: nextWindow,
    });
    await consumeRateLimit(
      "203.0.113.7",
      { ...policy, id: "booking" },
      {
        hashSecret,
        database: testDatabase.database,
        now: nextWindow,
      },
    );

    expect(rollover).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });
    expect(await testDatabase.database.select().from(table.rateLimit)).toHaveLength(3);
  });

  it("keeps counters independent for different client addresses", async () => {
    const now = new Date("2026-01-01T00:00:10.000Z");

    const firstClientResults = await Promise.all(
      Array.from({ length: 3 }, () =>
        consumeRateLimit("203.0.113.7", policy, {
          hashSecret,
          database: testDatabase.database,
          now,
        }),
      ),
    );
    const secondClientResult = await consumeRateLimit("203.0.113.8", policy, {
      hashSecret,
      database: testDatabase.database,
      now,
    });

    expect(firstClientResults.filter((result) => !result.allowed)).toHaveLength(1);
    expect(secondClientResult).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });

    const rows = await testDatabase.database.select().from(table.rateLimit);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.requestCount).sort()).toEqual([1, 3]);
    expect(new Set(rows.map((row) => row.keyHash)).size).toBe(2);
  });

  it("allows exactly the configured limit and keeps counting rejected attempts", async () => {
    const now = new Date("2026-01-01T00:00:45.000Z");

    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(
        await consumeRateLimit("203.0.113.7", policy, {
          hashSecret,
          database: testDatabase.database,
          now,
        }),
      );
    }

    expect(results).toEqual([
      { allowed: true, remaining: 1, retryAfterSeconds: 0 },
      { allowed: true, remaining: 0, retryAfterSeconds: 0 },
      { allowed: false, remaining: 0, retryAfterSeconds: 15 },
      { allowed: false, remaining: 0, retryAfterSeconds: 15 },
    ]);

    const rows = await testDatabase.database.select().from(table.rateLimit);
    expect(rows[0].requestCount).toBe(4);
  });

  it("stores fixed-window timestamps and retains the row for one extra window", async () => {
    await consumeRateLimit("203.0.113.7", policy, {
      hashSecret,
      database: testDatabase.database,
      now: new Date("2026-01-01T00:00:30.000Z"),
    });

    const rows = await testDatabase.database.select().from(table.rateLimit);
    expect(rows[0].windowStart).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(rows[0].expiresAt).toEqual(new Date("2026-01-01T00:02:00.000Z"));
  });

  it("rejects a short hash secret without writing a counter", async () => {
    await expect(
      consumeRateLimit("203.0.113.7", policy, {
        hashSecret: "too-short",
        database: testDatabase.database,
        now: new Date("2026-01-01T00:00:30.000Z"),
      }),
    ).rejects.toThrow("RATE_LIMIT_HASH_SECRET must be at least 32 characters");

    expect(await testDatabase.database.select().from(table.rateLimit)).toEqual([]);
  });
});
