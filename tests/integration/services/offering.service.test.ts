import * as table from "$lib/server/db/schema";
import { OfferingService } from "$lib/server/services/offering.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedOffering, seedStaff } from "../../support/fixtures";

describe("OfferingService", () => {
  let testDatabase: TestDatabase;
  let service: OfferingService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedStaff(testDatabase.database);
    await seedStaff(testDatabase.database, {
      id: "staff-2",
      name: "Second Barber",
      email: "second-barber@example.com",
    });
    service = new OfferingService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("returns only active offerings by default", async () => {
    await seedOffering(testDatabase.database, { id: "active", active: true });
    await seedOffering(testDatabase.database, { id: "inactive", active: false });

    expect(await service.getAll()).toEqual([
      expect.objectContaining({ id: "active", active: true }),
    ]);
    expect(await service.getAll(false)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "active" }),
        expect.objectContaining({ id: "inactive" }),
      ]),
    );
  });

  it("filters offerings by staff", async () => {
    await seedOffering(testDatabase.database, { id: "staff-1-offering" });
    await seedOffering(testDatabase.database, {
      id: "staff-2-offering",
      staffID: "staff-2",
      name: "Second Haircut",
    });

    expect(await service.getByStaff("staff-1")).toEqual([
      expect.objectContaining({ id: "staff-1-offering", staffID: "staff-1" }),
    ]);
    expect(await service.getByStaff("staff-2")).toEqual([
      expect.objectContaining({ id: "staff-2-offering", staffID: "staff-2" }),
    ]);
  });

  it("inserts, updates, and deletes a offering", async () => {
    const inserted = await service.insert({
      id: "haircut",
      staffID: "staff-1",
      name: "Haircut",
      description: "Initial description",
      duration: 30,
      price: 2_000,
      active: false,
    });
    expect(inserted.isOk()).toBe(true);
    if (inserted.isErr()) throw new Error(`Offering insertion failed: ${inserted.error.type}`);
    expect(inserted.value).toEqual({ affectedRows: 1 });

    const updated = await service.update({
      id: "haircut",
      staffID: "staff-1",
      name: "Premium Haircut",
      description: "Updated description",
      duration: 45,
      price: 3_000,
      active: true,
    });
    expect(updated.isOk() && updated.value).toEqual({ affectedRows: 1 });
    expect(await service.getByStaff("staff-1")).toEqual([
      expect.objectContaining({ id: "haircut", name: "Premium Haircut", duration: 45 }),
    ]);

    const deleted = await service.delete("haircut", "staff-1");
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    expect(await service.getAll(false)).toEqual([]);
  });

  it("does not update or delete another staff member's offering", async () => {
    await seedOffering(testDatabase.database, {
      id: "staff-2-offering",
      staffID: "staff-2",
      name: "Second Haircut",
    });

    const updated = await service.update({
      id: "staff-2-offering",
      staffID: "staff-1",
      name: "Hijacked",
      duration: 10,
      price: 0,
      active: false,
    });
    expect(updated.isErr() && updated.error.type).toBe("forbidden");
    const deleted = await service.delete("staff-2-offering", "staff-1");
    expect(deleted.isErr() && deleted.error.type).toBe("forbidden");
    expect(await service.getByStaff("staff-2")).toEqual([
      expect.objectContaining({ id: "staff-2-offering", name: "Second Haircut" }),
    ]);
  });

  it("rejects a offering for missing staff without leaving a row", async () => {
    const result = await service.insert({
      id: "orphan-offering",
      staffID: "missing-staff",
      name: "Orphan Offering",
      duration: 30,
      price: 2_000,
      active: true,
    });

    expect(result.isErr() && result.error.type).toBe("storage-error");
    expect(await testDatabase.database.select().from(table.offering)).toEqual([]);
  });

  it("does not delete a offering referenced by a reservation", async () => {
    await seedOffering(testDatabase.database, { id: "reserved-offering" });
    await testDatabase.database.insert(table.reservation).values({
      id: "reservation-1",
      date: "2099-06-15",
      hour: "10:00",
      name: "Customer",
      email: "customer@example.com",
      expiresAt: new Date("2099-06-16T00:00:00.000Z"),
      staffID: "staff-1",
    });
    await testDatabase.database.insert(table.reservationOffering).values({
      reservationID: "reservation-1",
      offeringID: "reserved-offering",
      position: 0,
    });

    const result = await service.delete("reserved-offering", "staff-1");
    expect(result.isErr() && result.error.type).toBe("storage-error");
    expect(await service.getAll(false)).toEqual([
      expect.objectContaining({ id: "reserved-offering" }),
    ]);
  });
});
