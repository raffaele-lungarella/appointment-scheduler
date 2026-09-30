import { err, ok } from "$lib/modules/result";
import * as table from "$lib/server/db/schema";
import { transactionResult } from "$lib/server/db/transaction";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../support/database";
import { seedUser } from "../support/fixtures";

describe("transactionResult", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedUser(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("commits writes and preserves the Ok result", async () => {
    const expected = ok("updated");
    const result = await transactionResult(testDatabase.database, async (tx) => {
      await tx.update(table.user).set({ name: "Updated" });
      return expected;
    });

    expect(result).toBe(expected);
    expect(await testDatabase.database.select().from(table.user)).toMatchObject([
      { name: "Updated" },
    ]);
  });

  it("rolls back writes and preserves the Err result", async () => {
    const before = await testDatabase.database.select().from(table.user);
    const expected = err({ type: "conflict" });
    const result = await transactionResult(testDatabase.database, async (tx) => {
      await tx.update(table.user).set({ name: "Must not persist" });
      return expected;
    });

    expect(result).toBe(expected);
    expect(await testDatabase.database.select().from(table.user)).toEqual(before);
  });

  it("rolls back writes and rethrows unexpected exceptions unchanged", async () => {
    const before = await testDatabase.database.select().from(table.user);
    const failure = new Error("Unexpected failure");

    await expect(
      transactionResult(testDatabase.database, async (tx) => {
        await tx.update(table.user).set({ name: "Must not persist" });
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await testDatabase.database.select().from(table.user)).toEqual(before);
  });

  it("does not convert database failures into business results", async () => {
    const before = await testDatabase.database.select().from(table.user);

    await expect(
      transactionResult(testDatabase.database, async (tx) => {
        await tx.update(table.user).set({ name: "Must not persist" });
        await tx.insert(table.user).values({
          id: "user-1",
          name: "Duplicate",
          email: "duplicate@example.com",
          passwordHash: "unused",
        });
        return ok(undefined);
      }),
    ).rejects.toThrow();

    expect(await testDatabase.database.select().from(table.user)).toEqual(before);
  });
});
