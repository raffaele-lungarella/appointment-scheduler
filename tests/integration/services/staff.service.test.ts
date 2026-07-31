import { StaffService } from "$lib/server/services/staff.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";
import { seedStaff } from "../../support/fixtures";

describe("StaffService", () => {
  let testDatabase: TestDatabase;
  let service: StaffService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await seedStaff(testDatabase.database);
    await seedStaff(testDatabase.database, {
      id: "staff-2",
      name: "Second Barber",
      email: "second-barber@example.com",
    });
    service = new StaffService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("lists only active staff", async () => {
    expect(await service.getAll()).toEqual([]);

    const missing = await service.toggleActive(true, "missing-staff");
    expect(missing.isErr() && missing.error.type).toBe("not-found");
    const activated = await service.toggleActive(true, "staff-1");
    expect(activated.isOk() && activated.value).toEqual({ affectedRows: 1 });

    expect(await service.getAll()).toEqual([
      {
        id: "staff-1",
        name: "Test Barber",
        avatar: null,
      },
    ]);
    expect(await service.getByUserID("staff-2")).toMatchObject({
      userID: "staff-2",
      isActive: false,
    });
  });

  it("updates and removes avatar data", async () => {
    const avatar = "data:image/png;base64,dGVzdA==";
    const original = "data:image/jpeg;base64,b3JpZ2luYWw=";

    expect(await service.updateAvatar("staff-1", avatar, original, 12.5, -4.5, 1.25)).toBe(true);
    expect(await service.getByUserID("staff-1")).toMatchObject({
      avatar,
      avatarOriginal: original,
      avatarOffsetX: 12.5,
      avatarOffsetY: -4.5,
      avatarDisplayScale: 1.25,
    });

    const deleted = await service.deleteAvatar("staff-1");
    expect(deleted.isOk() && deleted.value).toEqual({ affectedRows: 1 });
    expect(await service.getByUserID("staff-1")).toMatchObject({
      avatar: null,
      avatarOriginal: null,
      avatarOffsetX: null,
      avatarOffsetY: null,
      avatarDisplayScale: null,
    });
    const missing = await service.deleteAvatar("missing-staff");
    expect(missing.isErr() && missing.error.type).toBe("not-found");
  });

  it("rejects invalid avatar data without changing the staff row", async () => {
    expect(
      await service.updateAvatar(
        "staff-1",
        "https://example.com/avatar.png",
        "data:image/png;base64,b3JpZ2luYWw=",
        0,
        0,
        1,
      ),
    ).toBe(false);

    expect(await service.getByUserID("staff-1")).toMatchObject({
      avatar: null,
      avatarOriginal: null,
    });
  });

  it("rejects unsafe avatar sizes and crop geometry", async () => {
    const avatar = "data:image/png;base64,dGVzdA==";
    const original = "data:image/jpeg;base64,b3JpZ2luYWw=";
    const oversizedOriginal = `data:image/jpeg;base64,${"A".repeat(2_000_004)}`;

    expect(await service.updateAvatar("staff-1", avatar, original, Infinity, 0, 1)).toBe(false);
    expect(await service.updateAvatar("staff-1", avatar, original, 0, 0, 0)).toBe(false);
    expect(await service.updateAvatar("staff-1", avatar, original, 10_001, 0, 1)).toBe(false);
    expect(await service.updateAvatar("staff-1", avatar, oversizedOriginal, 0, 0, 1)).toBe(false);
    expect(await service.updateAvatar("missing-staff", avatar, original, 0, 0, 1)).toBe(false);
  });
});
