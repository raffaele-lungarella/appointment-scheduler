import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import type { Staff } from "@types";
import { Service } from "./service";

export class StaffService extends Service {
	async getByUserID(userID: string) {
		try {
			return await db.select().from(table.staff).where(eq(table.staff.userID, userID)).get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getAll(): Promise<Staff[] | null> {
		try {
			const result = await db
				.select({
					name: table.user.name,
					id: table.staff.userID,
					avatar: table.staff.avatar,
				})
				.from(table.staff)
				.innerJoin(table.user, eq(table.user.id, table.staff.userID))
				.where(eq(table.staff.isActive, true));

			return result;
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async toggleActive(isActive: boolean, userID: string): Promise<boolean> {
		try {
			return !!(await db
				.update(table.staff)
				.set({ isActive })
				.where(eq(table.staff.userID, userID)));
		} catch (e) {
			logger.error(e);
			return false;
		}
	}

	async updateAvatar(userID: string, avatar: string) {
		try {
			return await db
				.update(table.staff)
				.set({ avatar })
				.where(eq(table.staff.userID, userID))
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}
}
