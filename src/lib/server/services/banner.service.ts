import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { logger } from "../logger";
import { Service } from "./service";

export class BannerService extends Service {
	async get() {
		try {
			return await db.select().from(table.banner).get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async update(message: string, visible: boolean) {
		try {
			await db.delete(table.banner);
			return await db.insert(table.banner).values({ message, visible }).returning().get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}
}
