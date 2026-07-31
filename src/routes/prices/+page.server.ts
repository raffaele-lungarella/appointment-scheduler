import { OfferingService } from "@service/offering.service.js";
import { ScheduleService } from "@service/schedule.service.js";
import { StaffService } from "@service/staff.service.js";

import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async () => {
  const [offerings, schedule, staff] = await Promise.all([
    OfferingService.get().getAll(),
    ScheduleService.get().getAll(),
    StaffService.get().getAll(),
  ]);
  return {
    offerings,
    schedule,
    staff,
    title: "Listino Prezzi -",
    header: "Listino Prezzi",
  };
};
