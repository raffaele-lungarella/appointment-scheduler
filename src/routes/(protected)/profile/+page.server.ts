import { BASE_URL } from "$env/static/private";
import { emailSchema } from "$lib/modules/zod-schemas";
import { passwordSchema } from "$lib/modules/zod-schemas";
import { logger } from "$lib/server/logger";
import { getString } from "$lib/utils";
import { fail, redirect } from "@sveltejs/kit";
import { hash, verify } from "argon2";
import type { Actions, PageServerLoad } from "./$types";
import { UserService } from "@service/user.service.js";
import { EmailVerificationService } from "@service/email-verification.service.js";
import { SessionService } from "@service/session.service.js";
import { PasswordRecoverService } from "@service/password-recover.service.js";
import { ReservationService } from "@service/reservation.service.js";
import { err, ok, type Result } from "$lib/modules/result";
import { EmailService } from "$lib/server/mailer";
import * as auth from "$lib/server/auth";

export const load: PageServerLoad = async ({ locals, url }) => {
	const confirmID = url.searchParams.get("confirm-email-change"); // Coming from an email
	const userService = UserService.get();

	let updatedEmail: Result<undefined, undefined> | null = null;
	if (confirmID) {
		const verified = await EmailVerificationService.get().getByID(confirmID);

		if (verified) {
			if (await userService.updateEmail(verified.userID, verified.email)) {
				updatedEmail = ok(undefined);
			}
		}

		updatedEmail = err(undefined);
	}

	if (!locals.user) {
		redirect(301, "/login");
	}

	return {
		user: locals.user,
		title: "Profilo -",
		updatedEmail,
	};
};

export const actions: Actions = {
	logout: async (event) => {
		logger.info("Logging out...");
		if (!event.locals.session) {
			return fail(401);
		}

		await auth.invalidateSession(event.locals.session.id);
		auth.deleteSessionTokenCookie(event);

		return redirect(302, "/");
	},
	updateInfo: async ({ locals, request, url }) => {
		const userService = UserService.get();

		if (!locals.session || !locals.user) {
			return fail(401, { success: false });
		}

		const formData = await request.formData();
		const phone = getString(formData, "phone");
		const name = getString(formData, "name");

		if (!name) {
			return fail(400, { success: false });
		}

		if (locals.user.data.phoneNumber !== phone) {
			await userService.updatePhoneNumber(locals.user.data.id, phone);
		}

		if (name && locals.user.data.name !== name) {
			await userService.updateName(locals.user.data.id, name);
		}

		redirect(302, url.pathname);
	},
	changeEmail: async ({ locals, request }) => {
		if (!locals.session || !locals.user) {
			return fail(401);
		}

		const formData = await request.formData();
		const email = getString(formData, "email").toLowerCase().trim();

		const correctEmail = emailSchema.safeParse(email);

		if (!correctEmail.success) {
			return fail(400, { message: "Inserisci una mail valida", success: false });
		}

		const userService = UserService.get();
		const existingUser = await userService.getByEmail(email);

		if (existingUser && existingUser.data.verifiedEmail) {
			return fail(400, {
				message: "Esiste già un utente con la mail inserita",
				success: false,
			});
		}

		const emailVerification = await EmailVerificationService.get().insert(
			email,
			locals.user.data.id,
		);

		if (!emailVerification) {
			return fail(400, {
				message: "Impossibile cambiare la mail. Riprova più tardi.",
				success: false,
			});
		}

		const sent = await new EmailService().changeEmail({
			name: locals.user.data.name,
			to: email,
			link: `${BASE_URL}/profile?confirm-email-change=${emailVerification.id}`,
		});

		if (sent.isErr()) {
			await EmailVerificationService.get().delete(emailVerification.id);

			return fail(500, {
				message: "Impossibile cambiare email. Riprova più tardi",
				success: false,
			});
		}

		return {
			success: true,
		};
	},
	deleteAccount: async (event) => {
		const user = event.locals.user;
		const session = event.locals.session;

		if (!user || !session) {
			logger.warn("Cannot delete account");
			return fail(403);
		}

		const userService = UserService.get();
		const sessionService = SessionService.get();
		const passwordRecoverService = PasswordRecoverService.get();
		const reservationService = ReservationService.get();

		logger.warn("Deleting account of user: " + user.data.email);

		// Delete all related data
		await sessionService.deleteAllByUserID(user.data.id);
		await reservationService.deleteAll(user.data.email);
		await passwordRecoverService.deleteByUserID(user.data.id);

		const res = await userService.delete(user.data.id);

		if (res) {
			logger.info("Successfully deleted account of user: " + res.email);
			auth.deleteSessionTokenCookie(event);

			return redirect(302, "/");
		} else {
			logger.error("Error while deleting account of user: " + user.data.email);
			return fail(500);
		}
	},
	changePassword: async (event) => {
		const userService = UserService.get();
		const user = event.locals.user;
		const session = event.locals.session;

		if (!user || !session) {
			return fail(400);
		}

		const formData = await event.request.formData();
		const newPassword = getString(formData, "new-pass");
		const oldPassword = getString(formData, "old-pass");

		const isPasswordSafe = passwordSchema.safeParse(newPassword);

		if (!isPasswordSafe.success) {
			return fail(404, { message: "La password inserita non è sicura" });
		}

		const validPassword = await verify(user.data.passwordHash, oldPassword, {});

		if (!validPassword) {
			return fail(404, {
				message: "La password attuale non è corretta",
			});
		}

		if (newPassword === oldPassword) {
			return fail(404, {
				message: "Devi inserire una password diversa dalla precedente",
			});
		}

		const passwordHash = await hash(newPassword, {
			memoryCost: 19456,
			timeCost: 2,
			parallelism: 1,
		});

		const response = await userService.updatePassword(passwordHash, user.data.id);
		if (!response) {
			return fail(404, {
				message: "Impossibile aggiornare la password. Riprova più tardi.",
			});
		}
	},
};
