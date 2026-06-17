import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { Service } from "./service";

export class SessionService extends Service {
	async insert(session: table.DBSession) {
		try {
			return await db.insert(table.session).values(session);
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getByID(sessionID: string) {
		try {
			return await db
				.select()
				.from(table.session)
				.where(eq(table.session.id, sessionID))
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async delete(sessionID: string) {
		try {
			return await db.delete(table.session).where(eq(table.session.id, sessionID));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAllByUserID(userID: string) {
		try {
			return await db.delete(table.session).where(eq(table.session.userID, userID));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}
}
