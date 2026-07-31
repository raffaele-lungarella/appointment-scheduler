import { ScheduleService } from "$lib/server/services/schedule.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedStaff } from "../../support/fixtures";

describe("ScheduleService", () => {
  let testDatabase: TestDatabase;
  let service: ScheduleService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedStaff(testDatabase.database);
    await seedStaff(testDatabase.database, {
      id: "staff-2",
      name: "Second Barber",
      email: "second-barber@example.com",
    });
    service = new ScheduleService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("replaces, reads, and deletes a staff schedule", async () => {
    const created = await service.update(
      [
        {
          staffID: "staff-1",
          day: 1,
          startHour: 9,
          endHour: 12,
        },
        {
          staffID: "staff-1",
          day: 1,
          startHour: 13,
          endHour: 17,
        },
      ],
      "staff-1",
    );

    expect(created.isOk() && created.value).toEqual({ affectedRows: 2 });
    expect(await service.getAll()).toHaveLength(2);

    const replaced = await service.update(
      [
        {
          staffID: "staff-1",
          day: 2,
          startHour: 10,
          endHour: 16,
        },
      ],
      "staff-1",
    );

    expect(replaced.isOk() && replaced.value).toEqual({ affectedRows: 3 });

    const schedules = await service.getAll();
    expect(schedules).toHaveLength(1);
    expect(schedules?.[0]).toMatchObject({
      staffID: "staff-1",
      day: 2,
      startHour: 10,
      startMinute: 0,
      endHour: 16,
      endMinute: 0,
    });

    const schedule = schedules?.[0];
    expect(schedule).toBeDefined();
    if (!schedule) throw new Error("Expected the replacement schedule to exist");

    const deleted = await service.delete(schedule.id, "staff-1");
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    expect(await service.getAll()).toEqual([]);
  });

  it("supports clearing a schedule and scopes deletion to its owner", async () => {
    const created = await service.update(
      [{ staffID: "staff-2", day: 1, startHour: 9, endHour: 12 }],
      "staff-2",
    );
    expect(created.isOk() && created.value).toEqual({ affectedRows: 1 });
    const secondStaffSchedule = (await service.getByStaff("staff-2"))?.[0];
    if (!secondStaffSchedule) throw new Error("Expected staff-2 schedule");

    const forbiddenDelete = await service.delete(secondStaffSchedule.id, "staff-1");
    expect(forbiddenDelete.isErr() && forbiddenDelete.error.type).toBe("not-found");
    expect(await service.getByStaff("staff-2")).toHaveLength(1);
    const cleared = await service.update([], "staff-2");
    expect(cleared.isOk() && cleared.value).toEqual({ affectedRows: 1 });
    expect(await service.getByStaff("staff-2")).toEqual([]);
    const missingDelete = await service.delete(999_999, "staff-1");
    expect(missingDelete.isErr() && missingDelete.error.type).toBe("not-found");
  });
});
