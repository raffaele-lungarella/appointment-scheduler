import type { PageServerLoad } from "./$types.js";
import { KindService } from "@service/kind.service.js";
import { StaffService } from "@service/staff.service.js";

export const load: PageServerLoad = async () => {
	return {
		kinds: KindService.get().getAll(),
		staff: StaffService.get().getAll(),
		title: "Listino Prezzi -",
		header: "Listino Prezzi",
	};
};
