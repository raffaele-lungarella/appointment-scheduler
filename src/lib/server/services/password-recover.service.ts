import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, lt } from "drizzle-orm";
import { logger } from "../logger";
import { Service } from "./service";

export class PasswordRecoverService extends Service {
	async insert(userID: string) {
		try {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 1); // Add one day

			return await db
				.insert(table.passwordRecover)
				.values({
					id: crypto.randomUUID(),
					userID,
					expiresAt,
				})
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getByID(id: string) {
		try {
			return await db
				.select()
				.from(table.passwordRecover)
				.where(eq(table.passwordRecover.id, id))
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async expire(id: string) {
		try {
			return await db
				.update(table.passwordRecover)
				.set({ expiresAt: null })
				.where(eq(table.passwordRecover.id, id))
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteByUserID(userID: string) {
		try {
			return await db
				.delete(table.passwordRecover)
				.where(eq(table.passwordRecover.userID, userID));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAllExpired() {
		try {
			return await db
				.delete(table.passwordRecover)
				.where(lt(table.passwordRecover.expiresAt, new Date()));
		} catch (err) {
			logger.error("Error while removing expired passwords recover records");
			console.error(err);
		}
	}
}
