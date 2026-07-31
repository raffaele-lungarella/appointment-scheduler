import * as table from "$lib/server/db/schema";
import { CleanupService } from "$lib/server/services/clean-up.service";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedStaff, seedUser } from "../../support/fixtures";

describe("CleanupService", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("reports deleted rows and is idempotent", async () => {
    const expired = new Date("2000-01-01T00:00:00.000Z");
    const future = new Date("2099-01-01T00:00:00.000Z");
    await seedStaff(testDatabase.database);
    await seedUser(testDatabase.database, { id: "expired-user", email: "expired@example.com" });
    await seedUser(testDatabase.database, { id: "active-user", email: "active@example.com" });
    await testDatabase.database
      .update(table.user)
      .set({ expiresAt: expired })
      .where(eq(table.user.id, "expired-user"));
    await testDatabase.database
      .update(table.user)
      .set({ expiresAt: future })
      .where(eq(table.user.id, "active-user"));

    await testDatabase.database.insert(table.reservation).values([
      {
        id: "expired-reservation",
        date: "2000-01-01",
        hour: "10:00",
        name: "Expired",
        email: "expired-reservation@example.com",
        expiresAt: expired,
        staffID: "staff-1",
      },
      {
        id: "expired-user-reservation",
        date: "2099-01-01",
        hour: "11:00",
        name: "Expired user",
        email: "expired@example.com",
        ownerUserID: "expired-user",
        expiresAt: future,
        staffID: "staff-1",
      },
    ]);
    await testDatabase.database.insert(table.emailVerification).values({
      id: "expired-email-verification",
      userID: "active-user",
      email: "next@example.com",
      expiresAt: expired,
    });
    await testDatabase.database.insert(table.passwordRecover).values({
      id: "expired-password-recovery",
      userID: "active-user",
      expiresAt: expired,
    });
    await testDatabase.database.insert(table.publicToken).values({
      tokenHash: "expired-public-token",
      purpose: "password_reset",
      userID: "active-user",
      expiresAt: expired,
    });
    await testDatabase.database.insert(table.rateLimit).values([
      {
        keyHash: "expired-rate-limit",
        windowStart: expired,
        requestCount: 3,
        expiresAt: expired,
      },
      {
        keyHash: "active-rate-limit",
        windowStart: future,
        requestCount: 1,
        expiresAt: future,
      },
    ]);

    const service = new CleanupService(testDatabase.database);
    const first = await service.deleteExpiredItems();

    expect(first).toMatchObject({
      success: true,
      failures: [],
      counts: {
        expiredReservations: 1,
        expiredEmailVerifications: 1,
        expiredPasswordRecoveries: 1,
        expiredPublicTokens: 1,
        expiredRateLimits: 1,
        expiredUserReservations: 1,
        expiredUsers: 1,
      },
    });
    expect(await testDatabase.database.select().from(table.user)).toHaveLength(2);
    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
    expect(await testDatabase.database.select().from(table.rateLimit)).toHaveLength(1);

    const second = await service.deleteExpiredItems();
    expect(second.success).toBe(true);
    expect(Object.values(second.counts).every((count) => count === 0)).toBe(true);
  });
});
