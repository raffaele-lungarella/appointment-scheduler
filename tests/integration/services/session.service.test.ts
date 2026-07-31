import * as table from "$lib/server/db/schema";
import { SessionService } from "$lib/server/services/session.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedUser } from "../../support/fixtures";

describe("SessionService", () => {
  let testDatabase: TestDatabase;
  let service: SessionService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedUser(testDatabase.database, { id: "user-1" });
    await seedUser(testDatabase.database, {
      id: "user-2",
      email: "second@example.com",
    });
    service = new SessionService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("inserts and retrieves a session", async () => {
    const expiresAt = new Date("2099-06-15T12:00:00.000Z");

    expect(
      await service.insert({
        id: "session-1",
        userID: "user-1",
        expiresAt,
      }),
    ).not.toBeNull();

    const session = await service.getByID("session-1");
    expect(session.isOk() && session.value).toMatchObject({
      id: "session-1",
      userID: "user-1",
      expiresAt,
    });
    const missing = await service.getByID("missing-session");
    expect(missing.isErr() && missing.error).toEqual({ type: "not-found" });
  });

  it("deletes one session without affecting another", async () => {
    const expiresAt = new Date("2099-06-15T12:00:00.000Z");
    await service.insert({ id: "session-1", userID: "user-1", expiresAt });
    await service.insert({ id: "session-2", userID: "user-1", expiresAt });

    expect(await service.delete("session-1")).not.toBeNull();
    expect((await service.getByID("session-1")).isErr()).toBe(true);
    expect((await service.getByID("session-2")).isOk()).toBe(true);
  });

  it("deletes only sessions belonging to the selected user", async () => {
    const expiresAt = new Date("2099-06-15T12:00:00.000Z");
    await service.insert({ id: "user-1-a", userID: "user-1", expiresAt });
    await service.insert({ id: "user-1-b", userID: "user-1", expiresAt });
    await service.insert({ id: "user-2-a", userID: "user-2", expiresAt });

    expect(await service.deleteAllByUserID("user-1")).not.toBeNull();
    expect((await service.getByID("user-1-a")).isErr()).toBe(true);
    expect((await service.getByID("user-1-b")).isErr()).toBe(true);
    expect((await service.getByID("user-2-a")).isOk()).toBe(true);
  });

  it("updates a password and revokes every session except the current one", async () => {
    const expiresAt = new Date("2099-06-15T12:00:00.000Z");
    await service.insert({ id: "current", userID: "user-1", expiresAt });
    await service.insert({ id: "other", userID: "user-1", expiresAt });
    await service.insert({ id: "unrelated", userID: "user-2", expiresAt });

    expect(
      await service.updatePasswordAndRevokeOtherSessions("user-1", "new-hash", "current"),
    ).toMatchObject({ id: "user-1", passwordHash: "new-hash" });
    expect((await service.getByID("current")).isOk()).toBe(true);
    expect((await service.getByID("other")).isErr()).toBe(true);
    expect((await service.getByID("unrelated")).isOk()).toBe(true);
  });

  it("distinguishes missing sessions from storage failures", async () => {
    const missing = await service.getByID("missing-session");
    expect(missing.isErr() && missing.error).toEqual({ type: "not-found" });

    await testDatabase.cleanup();
    const unavailable = await service.getByID("session-1");
    expect(unavailable.isErr() && unavailable.error).toEqual({ type: "storage-error" });
  });

  it("returns null when foreign-key validation rejects a session", async () => {
    const result = await service.insert({
      id: "orphan-session",
      userID: "missing-user",
      expiresAt: new Date("2099-06-15T12:00:00.000Z"),
    });

    expect(result).toBeNull();
    expect(await testDatabase.database.select().from(table.session)).toEqual([]);
  });
});
