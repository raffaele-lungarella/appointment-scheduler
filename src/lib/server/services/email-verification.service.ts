import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, lt } from "drizzle-orm";
import { logger } from "../logger";
import { Service } from "./service";

export class EmailVerificationService extends Service {
	async insert(newEmail: string, userID: string) {
		try {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 1); // Add one day

			return await db
				.insert(table.emailVerification)
				.values({
					id: crypto.randomUUID(),
					userID,
					expiresAt,
					email: newEmail.toLowerCase().trim(),
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
				.from(table.emailVerification)
				.where(eq(table.emailVerification.id, id))
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async delete(id: string) {
		try {
			return await db
				.delete(table.emailVerification)
				.where(eq(table.emailVerification.id, id));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteByUserID(userID: string) {
		try {
			return await db
				.delete(table.emailVerification)
				.where(eq(table.emailVerification.userID, userID));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAllExpired() {
		try {
			return await db
				.delete(table.emailVerification)
				.where(lt(table.emailVerification.expiresAt, new Date()));
		} catch (err) {
			logger.error("Error while removing expired verify email records");
			console.error(err);
		}
	}
}
