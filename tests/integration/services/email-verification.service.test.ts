import { DAY_IN_MS } from "$lib/constants";
import { EmailVerificationService } from "$lib/server/services/email-verification.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedUser } from "../../support/fixtures";

describe("EmailVerificationService", () => {
  let testDatabase: TestDatabase;
  let service: EmailVerificationService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedUser(testDatabase.database);
    service = new EmailVerificationService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("inserts normalized legacy tokens through the injected database", async () => {
    const beforeInsert = Date.now();
    const inserted = await service.insert("  NEW@EXAMPLE.COM  ", "user-1");

    expect(inserted).toMatchObject({
      id: expect.any(String),
      userID: "user-1",
      email: "new@example.com",
      expiresAt: expect.any(Date),
    });
    if (!inserted?.expiresAt) throw new Error("Expected a token expiration date");
    expect(inserted.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeInsert + DAY_IN_MS - 1_000);
    expect(await service.getByID(inserted.id)).toMatchObject(inserted);
  });

  it("rejects invalid token data", async () => {
    expect(await service.insert("not-an-email", "user-1")).toBeNull();
  });
});
