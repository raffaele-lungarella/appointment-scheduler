import * as table from "$lib/server/db/schema";
import { ShutdownService } from "$lib/server/services/shutdown.service";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedStaff } from "../../support/fixtures";

describe("ShutdownService", () => {
  let testDatabase: TestDatabase;
  let service: ShutdownService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedStaff(testDatabase.database);
    await seedStaff(testDatabase.database, {
      id: "staff-2",
      name: "Second Barber",
      email: "second-barber@example.com",
    });
    service = new ShutdownService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("inserts shutdowns and filters them by staff", async () => {
    const first = await service.insert("2099-06-15", "2099-06-20", "staff-1");
    const second = await service.insert("2099-07-01", "2099-07-02", "staff-2");

    expect(first.isOk() && first.value).toEqual({ affectedRows: 1 });
    expect(second.isOk() && second.value).toEqual({ affectedRows: 1 });

    const all = await service.getAll();
    expect(all).toHaveLength(2);
    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          staffID: "staff-1",
          start: "2099-06-15",
          end: "2099-06-20",
        }),
        expect.objectContaining({
          staffID: "staff-2",
          start: "2099-07-01",
          end: "2099-07-02",
        }),
      ]),
    );

    expect(await service.getStaffShutdown("staff-1")).toEqual([
      expect.objectContaining({
        staffID: "staff-1",
      }),
    ]);
  });

  it("rejects invalid dates before writing to SQLite", async () => {
    const invalidStart = await service.insert("not-a-date", "2099-06-20", "staff-1");
    const invalidEnd = await service.insert("2099-06-15", "also-invalid", "staff-1");
    expect(invalidStart.isErr() && invalidStart.error.type).toBe("invalid-input");
    expect(invalidEnd.isErr() && invalidEnd.error.type).toBe("invalid-input");
    expect(await testDatabase.database.select().from(table.shutdowns)).toEqual([]);
  });

  it("returns a storage error when the staff foreign key does not exist", async () => {
    const result = await service.insert("2099-06-15", "2099-06-20", "missing-staff");
    expect(result.isErr() && result.error.type).toBe("storage-error");
    expect(await testDatabase.database.select().from(table.shutdowns)).toEqual([]);
  });

  it("deletes a shutdown by ID", async () => {
    const inserted = await service.insert("2099-06-15", "2099-06-20", "staff-1");
    if (inserted.isErr()) throw new Error("Expected shutdown insertion to succeed");
    const shutdown = (await service.getStaffShutdown("staff-1"))?.[0];
    if (!shutdown) throw new Error("Expected inserted shutdown");

    const missing = await service.delete("missing-shutdown", "staff-1");
    expect(missing.isErr() && missing.error.type).toBe("not-found");
    const wrongOwner = await service.delete(shutdown.id, "staff-2");
    expect(wrongOwner.isErr() && wrongOwner.error.type).toBe("not-found");
    const deleted = await service.delete(shutdown.id, "staff-1");
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    expect(await service.getAll()).toEqual([]);
  });

  it("removes shutdowns when their staff user is deleted", async () => {
    await service.insert("2099-06-15", "2099-06-20", "staff-1");
    await service.insert("2099-07-01", "2099-07-02", "staff-2");

    await testDatabase.database.delete(table.user).where(eq(table.user.id, "staff-1"));

    expect(await service.getAll()).toEqual([expect.objectContaining({ staffID: "staff-2" })]);
  });
});
