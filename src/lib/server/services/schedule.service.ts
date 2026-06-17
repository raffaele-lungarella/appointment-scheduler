import * as table from "$lib/server/db/schema";
import { logger } from "../logger";
import { db } from "$lib/server/db";
import type { DBSchedule, Schedule } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { Service } from "./service";

export class ScheduleService extends Service {
	async getAll(): Promise<DBSchedule[] | null> {
		try {
			return db.select().from(table.schedule);
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async update(schedules: Schedule[], staffID: string): Promise<boolean> {
		try {
			// Delete all existing schedules
			await db.delete(table.schedule).where(eq(table.schedule.staffID, staffID));
			// Insert new schedules
			const result = await db.insert(table.schedule).values(schedules).returning();
			return !!result.length;
		} catch (e) {
			logger.error(e);
			return false;
		}
	}

	async delete(id: number): Promise<boolean> {
		try {
			await db.delete(table.schedule).where(eq(table.schedule.id, id));
			return true;
		} catch (e) {
			logger.error(e);
			return false;
		}
	}
}
