import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { ok, err, type Result } from "$lib/modules/result";
import { Service } from "./service";

export class KindService extends Service {
	async getAll(onlyActive: boolean = true) {
		try {
			const query = db.select().from(table.kind);

			if (onlyActive) {
				return await query.where(eq(table.kind.active, true));
			}

			return await query;
		} catch {
			return null;
		}
	}

	async getByStaff(staffID: string) {
		try {
			return await db.select().from(table.kind).where(eq(table.kind.staffID, staffID));
		} catch {
			return null;
		}
	}

	async insert(kind: table.DBKind): Promise<Result<table.DBKind, string>> {
		try {
			return ok(await db.insert(table.kind).values(kind).returning().get());
		} catch (e) {
			logger.error(e, "Error while adding kind");
			return err("Could not insert kind");
		}
	}

	async update(kind: table.DBKind) {
		try {
			// Make sure we have an ID for the update
			if (!kind.id) {
				logger.error("Attempted to update kind without ID");
				return null;
			}

			const { id: _, ...kindWID } = kind;

			return await db
				.update(table.kind)
				.set(kindWID)
				.where(eq(table.kind.id, kind.id))
				.returning()
				.get();
		} catch (err) {
			logger.error({ err, kindID: kind.id }, "Error while updating kind");
			return null;
		}
	}

	async delete(id: string) {
		try {
			return await db.delete(table.kind).where(eq(table.kind.id, id)).returning().get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}
}
