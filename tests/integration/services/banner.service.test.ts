import { BannerService } from "$lib/server/services/banner.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../../support/database";

describe("BannerService", () => {
  let testDatabase: TestDatabase;
  let service: BannerService;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    service = new BannerService(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("reads and updates through the injected database", async () => {
    expect(await service.get()).toBeUndefined();

    const updated = await service.update("Appointments available", true);

    expect(updated.isOk()).toBe(true);
    if (!updated.isOk()) throw new Error(updated.error.type);
    expect(updated.value).toEqual({ affectedRows: 1 });
    expect(await service.get()).toMatchObject({
      id: 1,
      message: "Appointments available",
      visible: true,
    });
  });

  it("returns a useful validation error", async () => {
    const result = await service.update("", true);

    expect(result.isErr() && result.error.type).toBe("invalid-input");
  });
});
