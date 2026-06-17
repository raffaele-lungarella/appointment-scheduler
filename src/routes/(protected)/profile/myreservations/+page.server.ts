import type { PageServerLoad } from "./$types";
import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import { logger } from "$lib/server/logger";
import { ReservationService } from "@service/reservation.service";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, "/login");
	}

	const reservations = await ReservationService.get().getByUser(locals.user.data.email);

	if (!reservations) {
		return error(500);
	}

	logger.info(`Retrieved ${reservations.length} reservations`);

	return { reservations, title: "Prenotazioni -" };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();

		const id = data.get("id") as string;

		const res = await ReservationService.get().delete(id);

		if (res) {
			return {
				res,
			};
		} else {
			return fail(500, { success: false });
		}
	},
};
