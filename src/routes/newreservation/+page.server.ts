import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { ReservationService } from "@service/reservation.service.js";
import { KindService } from "@service/kind.service.js";
import { ShutdownService } from "@service/shutdown.service.js";
import { StaffService } from "@service/staff.service.js";
import type { Data } from "@types";
import { logger } from "$lib/server/logger.js";
import { EmailService } from "$lib/server/mailer.js";
import { formatDate, formatTime } from "$lib/utils.js";
import { BASE_URL } from "$env/static/private";
import { ScheduleService } from "@service/schedule.service.js";

export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;
		const user = locals.user;
		const formData = await request.formData();

		let data: Data | undefined;
		try {
			data = JSON.parse(formData.get("data") as unknown as string);
		} catch (e) {
			logger.warn(e);
			return fail(404);
		}

		if (!data) {
			return fail(404);
		}

		const reservationService = ReservationService.get();
		let result: Awaited<ReturnType<typeof reservationService.insertByUser>> | undefined =
			undefined;
		if (data.who === "usual") {
			if (!user) {
				logger.error(
					"Tried to insert a reservation by an usual user while not being logged in",
				);
				redirect(308, "/login");
			}
			result = await reservationService.insertByUser(data, user.data);
		} else if (data.who === "anonymous") {
			result = await reservationService.insertByAnonymous(data);
		} else if (data.who === "staff") {
			if (!user) {
				logger.error(
					"Tried to insert a reservation by an usual user while not being logged in",
				);
				redirect(308, "/login");
			}
			const alternativeName = data.name;
			result = await reservationService.insertByStaff(data, user.data, alternativeName);
		} else {
			logger.error("Did not specify the kind of user");
			return fail(404);
		}

		if (result.isOk()) {
			if (data.who === "anonymous") {
				const sent = await new EmailService().newReservation({
					name: data.name,
					link: `${BASE_URL}?reservation=${result.value.id}`,
					staffName: result.value.staff.name,
					serviceName: result.value.kind.name,
					date: formatDate(result.value.date),
					hour: formatTime(result.value.hour),
					to: data.email,
				});

				logger.warn(sent);

				if (sent.isErr()) {
					logger.error("Could not send email");
					return fail(500, {
						email: true,
					});
				}
			}

			return result.value;
		} else {
			logger.error(result.error);
			switch (result.error) {
				case "conflict": {
					return fail(409);
				}
				default: {
					return fail(404);
				}
			}
		}
	},
};

export const load: PageServerLoad = async ({ locals }) => {
	const kind = KindService.get();
	const reservationService = ReservationService.get();

	const [currentReservations, shutdown] = await Promise.all([
		reservationService.getAll(),
		ShutdownService.get().getAll(),
	]);

	if (!currentReservations || !shutdown) {
		return error(500);
	}

	return {
		currentReservations,
		shutdown,
		kinds: kind.getAll(),
		staff: StaffService.get().getAll(),
		schedule: await ScheduleService.get().getAll(),
		user: locals.user,
		title: "Nuova prenotazione -",
	};
};
