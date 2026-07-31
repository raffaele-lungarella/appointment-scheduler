import { err, ok } from "$lib/modules/result";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import type { ScheduleRow, NewScheduleRow } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("ScheduleService");

export class ScheduleService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async getAll(): Promise<ScheduleRow[] | null> {
    try {
      return await this.database.select().from(table.schedule);
    } catch (e) {
      logger.error({ err: e }, "getAll failed");
      return null;
    }
  }

  async getByStaff(staffID: string): Promise<ScheduleRow[] | null> {
    try {
      return await this.database
        .select()
        .from(table.schedule)
        .where(eq(table.schedule.staffID, staffID));
    } catch (e) {
      logger.error({ err: e, staffID }, "getByStaff failed");
      return null;
    }
  }

  async update(schedules: NewScheduleRow[], staffID: string): Promise<ServiceResult<AffectedRows>> {
    if (!staffID || schedules.some((schedule) => schedule.staffID !== staffID)) {
      return err({ type: "invalid-input" });
    }

    try {
      const affectedRows = await this.database.transaction(async (tx) => {
        const deleted = await tx
          .delete(table.schedule)
          .where(eq(table.schedule.staffID, staffID))
          .returning({ id: table.schedule.id });
        if (schedules.length === 0) return deleted.length;

        const inserted = await tx
          .insert(table.schedule)
          .values(schedules)
          .returning({ id: table.schedule.id });
        return deleted.length + inserted.length;
      });
      return ok({ affectedRows });
    } catch (e) {
      logger.error({ err: e, staffID }, "update failed");
      return err({ type: "storage-error" });
    }
  }

  async delete(id: number, staffID: string): Promise<ServiceResult<AffectedRows>> {
    if (!Number.isSafeInteger(id) || id <= 0 || !staffID) return err({ type: "invalid-input" });

    try {
      const deleted = await this.database
        .delete(table.schedule)
        .where(and(eq(table.schedule.id, id), eq(table.schedule.staffID, staffID)))
        .returning({ id: table.schedule.id });
      return deleted.length === 1 ? ok({ affectedRows: 1 }) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, scheduleId: id, staffID }, "delete failed");
      return err({ type: "storage-error" });
    }
  }
}
