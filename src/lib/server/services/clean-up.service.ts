import { logger } from "../logger";
import { UserService } from "./user.service";
import { SessionService } from "./session.service";
import { EmailVerificationService } from "./email-verification.service";
import { PasswordRecoverService } from "./password-recover.service";
import { ReservationService } from "./reservation.service";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { Service } from "./service";

export class CleanupService extends Service {
	async deleteExpiredItems() {
		try {
			const reservationService = ReservationService.get();
			const emailVerificationService = EmailVerificationService.get();
			const passwordRecoverService = PasswordRecoverService.get();

			await Promise.all([
				reservationService.deleteAllExpired(),
				emailVerificationService.deleteAllExpired(),
				passwordRecoverService.deleteAllExpired(),
			]);

			await this.deleteExpiredUsers();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	private async deleteExpiredUsers() {
		try {
			const sessionService = SessionService.get();
			const passwordRecoverService = PasswordRecoverService.get();
			const reservationService = ReservationService.get();

			const expiredUsers = await db
				.select({ id: table.user.id, email: table.user.email })
				.from(table.user)
				.where(
					and(
						eq(table.user.verifiedEmail, false),
						isNotNull(table.user.expiresAt),
						lt(table.user.expiresAt, new Date()),
					),
				);

			if (expiredUsers.length === 0) {
				return;
			}

			for (const user of expiredUsers) {
				await sessionService.deleteAllByUserID(user.id);
				await passwordRecoverService.deleteByUserID(user.id);
				await reservationService.deleteAll(user.email);
			}

			await UserService.get().deleteAllExpired();
		} catch (err) {
			logger.error("Error while removing expired users");
			console.error(err);
		}
	}
}
