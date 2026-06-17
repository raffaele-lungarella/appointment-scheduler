import { getLocalTimeZone, today } from "@internationalized/date";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { ReservationService } from "@service/reservation.service";

export const load: PageServerLoad = async ({ url, locals }) => {
	const date = url.searchParams.get("date");

	if (!locals.user) {
		redirect(302, "/login");
	}

	const reservations = ReservationService.get().getTodayReservations(
		date ?? today(getLocalTimeZone()).toString(),
		locals.user?.data.id,
	);

	return {
		reservations,
		date,
		title: "Admin -",
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const resService = ReservationService.get();
		const data = await request.formData();

		const id = data.get("id") as string;

		const res = await resService.delete(id);

		if (res) {
			return {
				res,
			};
		} else {
			return fail(500, { success: false });
		}
	},
};
