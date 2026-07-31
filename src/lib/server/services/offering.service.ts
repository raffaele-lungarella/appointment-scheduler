import { err, ok } from "$lib/modules/result";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("OfferingService");

export class OfferingService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async getAll(onlyActive: boolean = true) {
    try {
      const query = this.database.select().from(table.offering);

      if (onlyActive) {
        return await query.where(eq(table.offering.active, true));
      }

      return await query;
    } catch {
      return null;
    }
  }

  async getByStaff(staffID: string) {
    try {
      return await this.database
        .select()
        .from(table.offering)
        .where(eq(table.offering.staffID, staffID));
    } catch {
      return null;
    }
  }

  async insert(offering: table.NewOfferingRow): Promise<ServiceResult<AffectedRows>> {
    if (!offering.id || !offering.staffID) return err({ type: "invalid-input" });

    try {
      const inserted = await this.database
        .insert(table.offering)
        .values(offering)
        .returning({ id: table.offering.id });
      return ok({ affectedRows: inserted.length });
    } catch (e) {
      logger.error({ err: e, offeringID: offering.id }, "insert failed");
      return err({ type: "storage-error" });
    }
  }

  async update(offering: table.NewOfferingRow): Promise<ServiceResult<AffectedRows>> {
    if (!offering.id || !offering.staffID) {
      logger.error({ offering }, "update called without ID or staff ID");
      return err({ type: "invalid-input" });
    }

    try {
      const { id: _, ...offeringWID } = offering;
      const updated = await this.database
        .update(table.offering)
        .set(offeringWID)
        .where(
          and(eq(table.offering.id, offering.id), eq(table.offering.staffID, offering.staffID)),
        )
        .returning({ id: table.offering.id });

      if (updated.length === 1) return ok({ affectedRows: 1 });
      return err(await this.scopedMissingError(offering.id));
    } catch (e) {
      logger.error({ err: e, offeringID: offering.id }, "update failed");
      return err({ type: "storage-error" });
    }
  }

  async delete(id: string, staffID: string): Promise<ServiceResult<AffectedRows>> {
    if (!id || !staffID) return err({ type: "invalid-input" });

    try {
      const deleted = await this.database
        .delete(table.offering)
        .where(and(eq(table.offering.id, id), eq(table.offering.staffID, staffID)))
        .returning({ id: table.offering.id });

      if (deleted.length === 1) return ok({ affectedRows: 1 });
      return err(await this.scopedMissingError(id));
    } catch (e) {
      logger.error({ err: e, offeringID: id, staffID }, "delete failed");
      return err({ type: "storage-error" });
    }
  }

  private async scopedMissingError(
    id: string,
  ): Promise<{ type: "not-found" } | { type: "forbidden" }> {
    const existing = await this.database
      .select({ id: table.offering.id })
      .from(table.offering)
      .where(eq(table.offering.id, id))
      .get();
    return existing ? { type: "forbidden" } : { type: "not-found" };
  }
}
