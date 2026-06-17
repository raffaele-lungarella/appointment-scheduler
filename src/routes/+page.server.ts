import * as auth from "$lib/server/auth";
import { logger } from "$lib/server/logger";
import { expired, getString } from "$lib/utils";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import { hash } from "argon2";
import type { PageServerLoad } from "./$types";
import { PageCase, getPageCase } from "./page-cases";
import { ReservationService } from "@service/reservation.service";
import { UserService } from "@service/user.service";
import { PasswordRecoverService } from "@service/password-recover.service";

export const load: PageServerLoad = async (event) => {
	const url = event.url;
	const pageCase = getPageCase(url);

	const resService = ReservationService.get();
	const userService = UserService.get();

	switch (pageCase) {
		case PageCase.CONFIRM_RESERVATION: {
			const id = url.searchParams.get("reservation");

			if (!id) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "server_error",
				};
			}
			// Check if reservation exists
			const reservation = await resService.getByID(id);

			// Display error
			if (!reservation) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "server_error",
				};
			}

			if (expired(reservation.expiresAt.getTime())) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "expired",
				};
			}

			const available = reservation.pending;
			if (!available) {
				return {
					pageCase,
					success: true,
					reservation: reservation,
					error: null,
				};
			}
			const updatedReservation = await resService.updateExpiration(reservation.id);

			return {
				pageCase,
				success: available,
				reservation: updatedReservation,
				error: null,
			};
		}
		case PageCase.CONFIRM_USER: {
			const id = url.searchParams.get("user");
			if (!id) {
				return {
					pageCase,
					success: false,
					pendingUser: null,
					error: "server_error",
					reservation: null,
				};
			}

			const user = await userService.getByID(id);
			if (user?.data.verifiedEmail || !user) {
				return {
					pageCase,
					success: false,
					pendingUser: user,
					error: "not_pending",
					reservation: null,
				};
			}

			const response = await userService.verifyEmail(user.data.id);
			if (!response) {
				return {
					pageCase,
					success: false,
					pendingUser: null,
					error: "server_error",
					reservation: null,
				};
			}

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, response.id);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

			throw redirect(302, url.pathname + url.search);
		}
		case PageCase.PENDING_RESERVATION: {
			const id = url.searchParams.get("pending");
			if (!id) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "server_error",
				};
			}
			const reservation = await resService.getByID(id);

			if (!reservation) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "server_error",
				};
			}

			if (expired(reservation.expiresAt.getTime())) {
				return {
					pageCase,
					success: false,
					reservation: null,
					error: "expired",
				};
			}

			return {
				pageCase,
				success: true,
				reservation,
				error: null,
			};
		}
		case PageCase.RECOVER_PASSWORD: {
			const id = url.searchParams.get("recover");
			if (!id) {
				return {
					pageCase,
					success: false,
					recoverID: null,
					error: "server_error",
					reservation: null,
				};
			}
			const passwordRecover = await PasswordRecoverService.get().getByID(id);
			if (!passwordRecover) {
				return {
					pageCase,
					success: false,
					recoverID: null,
					error: "server_error",
					reservation: null,
				};
			}

			if (!passwordRecover.expiresAt || expired(passwordRecover.expiresAt?.getTime())) {
				return {
					pageCase,
					success: false,
					recoverID: null,
					error: "expired",
					reservation: null,
				};
			}

			return {
				pageCase,
				recoverID: passwordRecover.id,
				success: true,
				error: null,
			};
		}
		case PageCase.NORMAL: {
			return {
				pageCase,
				success: null,
				reservation: null,
				user: null,
				error: null,
			};
		}
	}
};

export const actions: Actions = {
	changePassword: async (event) => {
		const data = await event.request.formData();
		const password = getString(data, "new-pass");
		const id = getString(data, "recover-id");

		const userService = UserService.get();

		if (!password) {
			return fail(400, { message: "Inserisci le informazioni necessarie" });
		}

		const passwordRecover = await PasswordRecoverService.get().getByID(id);

		if (!passwordRecover) {
			logger.error(
				`${event.url}: Could not update password, the password recover does not exist`,
			);
			return fail(500, {
				message: `C'è stato un problema con la tua richiesta`,
				error: "server_error",
			});
		}
		if (
			!passwordRecover.expiresAt ||
			(passwordRecover.expiresAt && expired(passwordRecover.expiresAt.getTime()))
		) {
			logger.error(`${event.url}: Could not update password, the request is expired`);
			return fail(500, { message: "La richiesta è scaduta", error: "expired" });
		}

		await PasswordRecoverService.get().expire(passwordRecover.id);
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			parallelism: 1,
		});
		const response = await userService.updatePassword(passwordHash, passwordRecover.userID);

		if (!response) {
			logger.error(
				`${event.url}: Could not update password because the password patch was not successfull`,
			);
			return fail(404, {
				message: "Impossibile aggiornare la password.",
			});
		}

		const user = await userService.getByID(passwordRecover.userID);

		if (!user) {
			logger.error(`${event.url}: Could not find user`);
			return;
		}

		if (!user.data.verifiedEmail) {
			logger.error(`${event.url}: User email not verified`);
			return;
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, user.data.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		if (user.role === "staff") {
			redirect(303, "/dashboard");
		}
		redirect(303, "/");
	},
};
