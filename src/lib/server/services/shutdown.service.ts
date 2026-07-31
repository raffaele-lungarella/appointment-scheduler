import type { ShutdownDTO } from "$lib/dto";
import { err, ok } from "$lib/modules/result";
import { shutdownSchema } from "$lib/modules/zod-schemas";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("ShutdownService");

export class ShutdownService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async getAll(): Promise<ShutdownDTO[] | null> {
    try {
      return await this.database
        .select({
          id: table.shutdowns.id,
          staffID: table.shutdowns.staffID,
          start: table.shutdowns.start,
          end: table.shutdowns.end,
        })
        .from(table.shutdowns);
    } catch (e) {
      logger.error({ err: e }, "getAll failed");
      return null;
    }
  }

  async getStaffShutdown(staffID: string): Promise<ShutdownDTO[] | null> {
    try {
      return await this.database
        .select({
          id: table.shutdowns.id,
          staffID: table.shutdowns.staffID,
          start: table.shutdowns.start,
          end: table.shutdowns.end,
        })
        .from(table.shutdowns)
        .where(eq(table.shutdowns.staffID, staffID));
    } catch (e) {
      logger.error({ err: e, staffId: staffID }, "getStaffShutdown failed");
      return null;
    }
  }

  async insert(start: string, end: string, staffID: string): Promise<ServiceResult<AffectedRows>> {
    const parsed = shutdownSchema.safeParse({ start, end, staffID });
    if (!parsed.success) {
      logger.error({ err: parsed.error }, "insert failed: invalid data");
      return err({ type: "invalid-input" });
    }

    try {
      const inserted = await this.database
        .insert(table.shutdowns)
        .values({
          id: crypto.randomUUID(),
          start: parsed.data.start,
          end: parsed.data.end,
          staffID: parsed.data.staffID,
        })
        .returning({ id: table.shutdowns.id });
      return ok({ affectedRows: inserted.length });
    } catch (e) {
      logger.error(
        { err: e, staffId: parsed.data.staffID, start: parsed.data.start, end: parsed.data.end },
        "insert failed",
      );
      return err({ type: "storage-error" });
    }
  }

  async delete(id: string, staffID: string): Promise<ServiceResult<AffectedRows>> {
    if (!id || !staffID) return err({ type: "invalid-input" });

    try {
      const deleted = await this.database
        .delete(table.shutdowns)
        .where(and(eq(table.shutdowns.id, id), eq(table.shutdowns.staffID, staffID)))
        .returning({ id: table.shutdowns.id });
      return deleted.length === 1 ? ok({ affectedRows: 1 }) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, shutdownId: id, staffID }, "delete failed");
      return err({ type: "storage-error" });
    }
  }
}
