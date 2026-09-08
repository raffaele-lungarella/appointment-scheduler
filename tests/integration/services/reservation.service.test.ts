import { createMinuteOfDay } from "$lib/domain/minute-of-day";
import * as table from "$lib/server/db/schema";
import {
  reservationConfirmationExpiresAt,
  ReservationService,
} from "$lib/server/services/reservation.service";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedOffering, seedStaff, seedUser } from "../../support/fixtures";

describe("ReservationService", () => {
  let testDatabase: TestDatabase;
  let service: ReservationService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedStaff(testDatabase.database);
    await testDatabase.database
      .update(table.staff)
      .set({ isActive: true })
      .where(eq(table.staff.userID, "staff-1"));
    await testDatabase.database.insert(table.schedule).values(
      Array.from({ length: 7 }, (_, day) => ({
        staffID: "staff-1",
        day,
        startHour: 9,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
      })),
    );
    await seedOffering(testDatabase.database, {
      id: "haircut",
      name: "Haircut",
      duration: 30,
      price: 2_000,
    });
    await seedOffering(testDatabase.database, {
      id: "beard",
      name: "Beard trim",
      duration: 15,
      price: 1_000,
    });
    service = new ReservationService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("inserts an anonymous reservation and preserves offering order", async () => {
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "  CUSTOMER@EXAMPLE.COM ",
      phone: "123456789",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["beard", "haircut"],
      staff: "staff-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw new Error(`Insertion failed: ${result.error}`);

    expect(result.value).toMatchObject({
      name: "Customer",
      email: "customer@example.com",
      pending: true,
      staff: { id: "staff-1", name: "Test Barber" },
      user: null,
    });
    expect(result.value.offerings.map((offering) => offering.id)).toEqual(["beard", "haircut"]);
    expect(result.value.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const junctionRows = await testDatabase.database
      .select()
      .from(table.reservationOffering)
      .where(eq(table.reservationOffering.reservationID, result.value.id));
    expect(junctionRows).toEqual([
      { reservationID: result.value.id, offeringID: "beard", position: 0 },
      { reservationID: result.value.id, offeringID: "haircut", position: 1 },
    ]);
  });

  it("persists and returns start minutes", async () => {
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "seconds@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(540),
      offerings: ["haircut"],
      staff: "staff-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw new Error(`Insertion failed: ${result.error}`);
    expect(result.value.startMinute).toBe(540);
  });

  it("rejects malformed dates without leaving partial rows", async () => {
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-02-30",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(result.isErr() && result.error.type).toBe("invalid-data");

    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
    expect(await testDatabase.database.select().from(table.reservationOffering)).toEqual([]);
  });

  it("rejects invalid offerings without leaving partial rows", async () => {
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut", "missing-offering"],
      staff: "staff-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected insertion to fail");
    expect(result.error).toMatchObject({
      type: "invalid-data",
      reason: "offerings-unavailable-for-staff",
    });
    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
    expect(await testDatabase.database.select().from(table.reservationOffering)).toEqual([]);
  });

  it("rejects past appointments", async () => {
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2020-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });

    expect(result.isErr() && result.error).toMatchObject({
      type: "invalid-data",
      reason: "appointment-not-in-future",
    });
  });

  it("rejects inactive staff and inactive services", async () => {
    await testDatabase.database
      .update(table.staff)
      .set({ isActive: false })
      .where(eq(table.staff.userID, "staff-1"));
    const inactiveStaff = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(inactiveStaff.isErr() && inactiveStaff.error).toMatchObject({
      type: "invalid-data",
      reason: "staff-not-active",
    });

    await testDatabase.database
      .update(table.staff)
      .set({ isActive: true })
      .where(eq(table.staff.userID, "staff-1"));
    await testDatabase.database
      .update(table.offering)
      .set({ active: false })
      .where(eq(table.offering.id, "haircut"));
    const inactiveOffering = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(inactiveOffering.isErr() && inactiveOffering.error).toMatchObject({
      type: "invalid-data",
      reason: "offerings-unavailable-for-staff",
    });
    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
  });

  it("rejects appointments outside schedule containment", async () => {
    for (const startMinute of [createMinuteOfDay(525), createMinuteOfDay(1065)]) {
      const result = await service.insertByAnonymous({
        who: "anonymous",
        name: "Customer",
        email: "customer@example.com",
        date: "2099-06-15",
        startMinute,
        offerings: ["haircut"],
        staff: "staff-1",
      });
      expect(result.isErr() && result.error).toMatchObject({
        type: "invalid-data",
        reason: "outside-staff-schedule",
      });
    }
    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
  });

  it("rejects appointments during an inclusive shutdown", async () => {
    await testDatabase.database.insert(table.shutdowns).values({
      id: "summer-shutdown",
      staffID: "staff-1",
      start: "2099-06-15",
      end: "2099-06-20",
    });
    const result = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });

    expect(result.isErr() && result.error).toMatchObject({
      type: "invalid-data",
      reason: "staff-shutdown",
    });
    expect(await testDatabase.database.select().from(table.reservation)).toEqual([]);
  });

  it("rejects overlaps but allows adjacent reservations", async () => {
    const first = await service.insertByAnonymous({
      who: "anonymous",
      name: "First Customer",
      email: "first@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut", "beard"],
      staff: "staff-1",
    });
    expect(first.isOk()).toBe(true);

    const overlapping = await service.insertByAnonymous({
      who: "anonymous",
      name: "Second Customer",
      email: "second@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(630),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(overlapping.isErr()).toBe(true);
    if (overlapping.isOk()) throw new Error("Expected overlapping insertion to fail");
    expect(overlapping.error).toEqual({ type: "conflict", reason: "slots-occupied" });

    const adjacent = await service.insertByAnonymous({
      who: "anonymous",
      name: "Third Customer",
      email: "third@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(645),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(adjacent.isOk()).toBe(true);
    expect(await testDatabase.database.select().from(table.reservation)).toHaveLength(2);
  });

  it("atomically rejects simultaneous overlapping bookings from independent clients", async () => {
    const clients = await Promise.all(Array.from({ length: 3 }, () => testDatabase.createClient()));
    try {
      const results = await Promise.all(
        clients.map((database, index) =>
          new ReservationService(database).insertByAnonymous({
            who: "anonymous",
            name: `Concurrent Customer ${index}`,
            email: `concurrent-${index}@example.com`,
            date: "2099-06-16",
            startMinute: createMinuteOfDay(index % 2 === 0 ? 600 : 615),
            offerings: ["haircut"],
            staff: "staff-1",
          }),
        ),
      );

      expect(results.filter((result) => result.isOk())).toHaveLength(1);
      const errors = results.flatMap((result) => (result.isErr() ? [result.error] : []));
      expect(errors).toEqual(
        Array.from({ length: clients.length - 1 }, () => ({
          type: "conflict",
          reason: "slots-occupied",
        })),
      );
      const rows = await testDatabase.database
        .select()
        .from(table.reservation)
        .where(eq(table.reservation.date, "2099-06-16"));
      expect(rows).toHaveLength(1);
    } finally {
      for (const client of clients) client.$client.close();
    }
  });

  it("isolates occupancy by staff and releases slots on deletion", async () => {
    await seedStaff(testDatabase.database, {
      id: "staff-2",
      name: "Second Barber",
      email: "second-barber@example.com",
    });
    await testDatabase.database
      .update(table.staff)
      .set({ isActive: true })
      .where(eq(table.staff.userID, "staff-2"));
    await testDatabase.database.insert(table.schedule).values(
      Array.from({ length: 7 }, (_, day) => ({
        staffID: "staff-2",
        day,
        startHour: 9,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
      })),
    );
    await seedOffering(testDatabase.database, { id: "staff-2-haircut", staffID: "staff-2" });

    const first = await service.insertByAnonymous({
      who: "anonymous",
      name: "First Customer",
      email: "first-slots@example.com",
      date: "2099-06-17",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    const otherStaff = await service.insertByAnonymous({
      who: "anonymous",
      name: "Other Staff Customer",
      email: "other-staff@example.com",
      date: "2099-06-17",
      startMinute: createMinuteOfDay(600),
      offerings: ["staff-2-haircut"],
      staff: "staff-2",
    });
    expect(first.isOk()).toBe(true);
    expect(otherStaff.isOk()).toBe(true);
    if (first.isErr()) throw new Error("Expected first reservation");

    await service.delete(first.value.id);
    const replacement = await service.insertByAnonymous({
      who: "anonymous",
      name: "Replacement Customer",
      email: "replacement@example.com",
      date: "2099-06-17",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(replacement.isOk()).toBe(true);
  });

  it("rounds service duration up to whole occupancy slots", async () => {
    await seedOffering(testDatabase.database, {
      id: "twenty-minutes",
      duration: 20,
    });

    const first = await service.insertByAnonymous({
      who: "anonymous",
      name: "First Customer",
      email: "rounded-first@example.com",
      date: "2099-06-18",
      startMinute: createMinuteOfDay(600),
      offerings: ["twenty-minutes"],
      staff: "staff-1",
    });
    expect(first.isOk()).toBe(true);
    if (first.isErr()) throw new Error("Expected first reservation");

    const [stored] = await testDatabase.database
      .select({ slotCount: table.reservation.slotCount })
      .from(table.reservation)
      .where(eq(table.reservation.id, first.value.id));
    expect(stored.slotCount).toBe(2);

    const nextSlot = await service.insertByAnonymous({
      who: "anonymous",
      name: "Second Customer",
      email: "rounded-second@example.com",
      date: "2099-06-18",
      startMinute: createMinuteOfDay(615),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(nextSlot.isErr() && nextSlot.error).toEqual({
      type: "conflict",
      reason: "slots-occupied",
    });
  });

  it("uses effective-dated slot policies and rejects unaligned reservations", async () => {
    await testDatabase.database.insert(table.reservationSlotPolicy).values({
      effectiveFromDate: "2099-07-01",
      slotDurationMinutes: 30,
    });

    const unaligned = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "policy@example.com",
      date: "2099-07-02",
      startMinute: createMinuteOfDay(615),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(unaligned.isErr() && unaligned.error).toMatchObject({
      type: "invalid-data",
      reason: "appointment-not-slot-aligned",
    });

    const aligned = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "policy@example.com",
      date: "2099-07-02",
      startMinute: createMinuteOfDay(630),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    expect(aligned.isOk()).toBe(true);
  });

  it("expires confirmed reservations at the next midnight in Europe/Rome", async () => {
    await seedUser(testDatabase.database, {
      id: "customer-user",
      name: "Customer",
      email: "customer@example.com",
    });
    const [customer] = await testDatabase.database
      .select()
      .from(table.user)
      .where(eq(table.user.id, "customer-user"));
    const result = await service.insertByUser(
      {
        who: "usual",
        date: "2099-06-15",
        startMinute: createMinuteOfDay(600),
        offerings: ["haircut"],
        staff: "staff-1",
      },
      customer,
    );
    if (result.isErr()) throw new Error(`Insertion failed: ${result.error}`);

    expect(result.value.expiresAt.toISOString()).toBe("2099-06-15T22:00:00.000Z");
  });

  it("uses the canonical reservation confirmation expiration", () => {
    expect(reservationConfirmationExpiresAt(1_000).getTime()).toBe(601_000);
  });

  it("returns occupied slots without reservation or customer identifiers", async () => {
    const inserted = await service.insertByAnonymous({
      who: "anonymous",
      name: "Private Customer",
      email: "private@example.com",
      phone: "123456789",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    if (inserted.isErr()) throw new Error(`Insertion failed: ${inserted.error}`);

    const occupiedSlots = await service.getOccupiedSlots();
    expect(occupiedSlots.isOk() && occupiedSlots.value).toEqual([
      {
        date: "2099-06-15",
        startMinute: createMinuteOfDay(600),
        staff: { id: "staff-1" },
        offerings: [{ duration: 30 }],
      },
    ]);
  });

  it("keeps stable ownership across email changes and email reuse", async () => {
    await seedUser(testDatabase.database, {
      id: "customer-user",
      name: "Original Customer",
      email: "customer@example.com",
    });
    const [customer] = await testDatabase.database
      .select()
      .from(table.user)
      .where(eq(table.user.id, "customer-user"));

    const inserted = await service.insertByUser(
      {
        who: "usual",
        date: "2099-06-15",
        startMinute: createMinuteOfDay(600),
        offerings: ["haircut"],
        staff: "staff-1",
      },
      customer,
    );
    if (inserted.isErr()) throw new Error(`Insertion failed: ${inserted.error}`);

    await testDatabase.database
      .update(table.user)
      .set({ email: "new@example.com" })
      .where(eq(table.user.id, customer.id));
    await seedUser(testDatabase.database, {
      id: "replacement-user",
      email: "customer@example.com",
    });

    const originalOwner = await service.getByIDForUser(
      inserted.value.id,
      customer.id,
      "new@example.com",
    );
    const replacementOwner = await service.getByIDForUser(
      inserted.value.id,
      "replacement-user",
      "customer@example.com",
    );

    expect(originalOwner.isOk() && originalOwner.value.id).toBe(inserted.value.id);
    expect(originalOwner.isOk() && originalOwner.value.email).toBe("customer@example.com");
    expect(replacementOwner.isErr() && replacementOwner.error.type).toBe("not-found");
  });

  it("returns explicit read and batch-delete results", async () => {
    const all = await service.getAll();
    const today = await service.getTodayReservations("2099-06-15", "staff-1");
    const byUser = await service.getByUser("customer-user", "customer@example.com");
    const missing = await service.getByID("missing");
    const batch = await service.deleteManyByUser([], "customer-user", "customer@example.com");
    const deletedAll = await service.deleteAllByUser("customer-user", "customer@example.com");

    expect(all.isOk() && all.value).toEqual([]);
    expect(today.isOk() && today.value).toEqual([]);
    expect(byUser.isOk() && byUser.value).toEqual([]);
    expect(missing.isErr() && missing.error.type).toBe("not-found");
    expect(batch.isOk() && batch.value).toEqual({ requestedRows: 0, affectedRows: 0 });
    expect(deletedAll.isOk() && deletedAll.value).toEqual({ affectedRows: 0 });
  });

  it("deletes all staff reservations before a staff account is removed", async () => {
    const inserted = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    if (inserted.isErr()) throw new Error(`Insertion failed: ${inserted.error}`);

    const deletedReservations = await service.deleteAllByStaff("staff-1");
    expect(deletedReservations.isOk() && deletedReservations.value).toEqual({ affectedRows: 1 });

    const deletedUser = await testDatabase.database
      .delete(table.user)
      .where(eq(table.user.id, "staff-1"))
      .returning({ id: table.user.id });
    expect(deletedUser).toEqual([{ id: "staff-1" }]);
    expect(await testDatabase.database.select().from(table.reservationOffering)).toEqual([]);
  });

  it("atomically scopes deletion to the authenticated staff", async () => {
    const inserted = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    if (inserted.isErr()) throw new Error(`Insertion failed: ${inserted.error}`);

    const wrongStaff = await service.deleteByStaff(inserted.value.id, "other-staff");
    expect(wrongStaff.isErr() && wrongStaff.error.type).toBe("not-found");
    expect((await service.getByID(inserted.value.id)).isOk()).toBe(true);

    const deleted = await service.deleteByStaff(inserted.value.id, "staff-1");
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    const missing = await service.getByID(inserted.value.id);
    expect(missing.isErr() && missing.error.type).toBe("not-found");
  });

  it("normalizes ownership checks and cascades reservation-offering deletion", async () => {
    await seedUser(testDatabase.database, {
      id: "customer-user",
      email: "customer@example.com",
    });

    const inserted = await service.insertByAnonymous({
      who: "anonymous",
      name: "Customer",
      email: "customer@example.com",
      date: "2099-06-15",
      startMinute: createMinuteOfDay(600),
      offerings: ["haircut"],
      staff: "staff-1",
    });
    if (inserted.isErr()) throw new Error(`Insertion failed: ${inserted.error}`);

    const wrongOwner = await service.deleteByUser(
      inserted.value.id,
      "wrong-user",
      "wrong@example.com",
    );
    expect(wrongOwner.isErr() && wrongOwner.error.type).toBe("not-found");
    expect((await service.getByID(inserted.value.id)).isOk()).toBe(true);

    const deleted = await service.deleteByUser(
      inserted.value.id,
      "customer-user",
      "  CUSTOMER@EXAMPLE.COM ",
    );
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    const missing = await service.getByID(inserted.value.id);
    expect(missing.isErr() && missing.error.type).toBe("not-found");
    expect(await testDatabase.database.select().from(table.reservationOffering)).toEqual([]);
  });
});
