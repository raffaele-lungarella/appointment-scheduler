import type { Actions } from "./$types";
import { fail } from "sveltekit-superforms";
import type { PageServerLoad } from "./$types";
import { ShutdownService } from "@service/shutdown.service";
import { ScheduleService } from "@service/schedule.service";
import type { Schedule } from "$lib/server/db/schema";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(301, "/login");
	}

	return {
		shutdown: ShutdownService.get().getStaffShutdown(locals.user.data.id),
		schedule: ScheduleService.get().getAll(),
	};
};

export const actions: Actions = {
	insertShutdown: async ({ request }) => {
		const data = await request.formData();
		const start = data.get("start") as string;
		const end = data.get("end") as string;
		const id = data.get("id") as string;

		if (!start || !end) {
			return fail(404);
		}
		return await ShutdownService.get().insert(start, end, id);
	},
	deleteShutdown: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		return await ShutdownService.get().delete(id);
	},
	addSchedule: async ({ request, locals }) => {
		const data = await request.formData();

		let dbschedule = JSON.parse(data.get("data") as string) as Schedule[];

		if (!locals.user) {
			return fail(401, { message: "Unauthorized" });
		}

		const staffID = locals.user.data.id;

		dbschedule = dbschedule.map((schedule) => {
			return {
				staffID,
				day: schedule.day,
				startHour: schedule.startHour,
				startMinute: schedule.startMinute,
				endHour: schedule.endHour,
				endMinute: schedule.endMinute,
			};
		});

		return { success: await ScheduleService.get().update(dbschedule, locals.user.data.id) };
	},
	deleteSchedule: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		const idNum = isNaN(Number(id)) ? null : Number(id);

		if (!idNum) {
			return fail(404);
		}
		return await ScheduleService.get().delete(idNum);
	},
};
