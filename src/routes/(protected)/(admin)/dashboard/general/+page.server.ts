import { logger } from "$lib/server/logger";
import { getBoolean, getNumber, getString } from "$lib/utils";
import type { Actions, PageServerLoad } from "./$types";
import { KindService } from "@service/kind.service";
import { error } from "@sveltejs/kit";
import { BannerService } from "@service/banner.service";
import { StaffService } from "@service/staff.service";
import { CleanupService } from "@service/clean-up.service";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return error(500);
	}

	const kinds = await KindService.get().getByStaff(locals.user.data.id);
	if (!kinds) {
		return error(500);
	}
	return {
		banner: await BannerService.get().get(),
		kinds,
	};
};

export const actions: Actions = {
	updateBanner: async ({ request }) => {
		const data = await request.formData();

		const message = getString(data, "message");
		const visible = getBoolean(data, "visible");

		await BannerService.get().update(message, visible);
	},
	updateKind: async ({ request, locals }) => {
		const data = await request.formData();

		const id = getString(data, "id");
		const name = getString(data, "name");
		const description = getString(data, "description");
		const duration = getNumber(data, "duration");
		const price = getNumber(data, "price");
		const active = getBoolean(data, "active");

		if (!id || !name || !duration || !price) {
			return {
				isUpdatingKind: true,
				success: false,
			};
		}

		const kinds = KindService.get();
		if (!locals.user) {
			return {
				success: false,
			};
		}

		const staffID = locals.user.data.id;
		const response = await kinds.update({
			id,
			name,
			description,
			duration,
			price,
			active,
			staffID,
		});

		if (response) {
			return {
				isUpdatingKind: true,
				success: true,
			};
		} else {
			return {
				isUpdatingKind: true,
				success: false,
			};
		}
	},
	addKind: async ({ request, locals }) => {
		const data = await request.formData();

		const name = getString(data, "name");
		const description = getString(data, "description");
		const duration = getNumber(data, "duration");
		const price = getNumber(data, "price");
		const active = getBoolean(data, "active");

		if (!locals.user) {
			return {
				success: false,
			};
		}

		const staffID = locals.user.data.id;

		if (!name || !duration || !price) {
			logger.error("Data is not enough to add a kind");
			return {
				isAddingKind: true,
				success: false,
			};
		}

		const kinds = KindService.get();
		const response = await kinds.insert({
			id: crypto.randomUUID(),
			name,
			description,
			duration,
			price,
			active,
			staffID,
		});

		if (response) {
			return {
				isAddingKind: true,
				success: true,
			};
		} else {
			logger.error("Could not add service");
			return {
				isAddingKind: true,
				success: false,
			};
		}
	},
	deleteKind: async ({ request }) => {
		const data = await request.formData();

		const id = getString(data, "id");

		if (!id) {
			logger.error("Id not sent");
			return {
				isDeletingKind: true,
				success: false,
			};
		}

		const response = await KindService.get().delete(id);

		if (response) {
			logger.info("Delete kind" + `${response.name}`);
			return {
				isDeletingKind: true,
				success: true,
			};
		} else {
			logger.error("Could not delete kind");
			return {
				isDeletingKind: true,
				success: false,
			};
		}
	},
	toggleStaff: async ({ request }) => {
		const data = await request.formData();
		const active = getBoolean(data, "active");
		const id = getString(data, "id");

		return await StaffService.get().toggleActive(active, id);
	},
	clean: async () => {
		await CleanupService.get().deleteExpiredItems();
	},
};
