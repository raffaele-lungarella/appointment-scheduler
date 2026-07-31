import { logger } from "$lib/server/logger";
import type { ServiceError } from "$lib/server/services/service-result";
import { offeringSchema, updateOfferingSchema } from "@schema";
import { BannerService } from "@service/banner.service";
import { CleanupService } from "@service/clean-up.service";
import { OfferingService } from "@service/offering.service";
import { ScheduleService } from "@service/schedule.service";
import { ShutdownService } from "@service/shutdown.service";
import { StaffService } from "@service/staff.service";
import { error, fail } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types";

type ScheduleInput = {
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

function getStaffID(locals: App.Locals): string | null {
  return locals.user?.role === "staff" ? locals.user.account.id : null;
}

function getRequiredString(data: FormData, key: string): string | null {
  const value = data.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getStrictBoolean(data: FormData, key: string): boolean | null {
  const value = data.get(key);
  if (value === "true" || value === "on") return true;
  if (value === "false" || value === "off") return false;
  return null;
}

function serviceErrorStatus(error: ServiceError): 400 | 403 | 404 | 409 | 500 {
  switch (error.type) {
    case "invalid-input":
      return 400;
    case "forbidden":
      return 403;
    case "not-found":
      return 404;
    case "conflict":
      return 409;
    case "storage-error":
      return 500;
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseSchedule(value: FormDataEntryValue | null, staffID: string) {
  if (typeof value !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const schedules = [];
  for (const candidate of parsed) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Partial<ScheduleInput>;
    const values = [item.day, item.startHour, item.startMinute, item.endHour, item.endMinute];
    if (!values.every((number) => Number.isInteger(number))) return null;

    const day = item.day as number;
    const startHour = item.startHour as number;
    const startMinute = item.startMinute as number;
    const endHour = item.endHour as number;
    const endMinute = item.endMinute as number;
    if (
      day < 0 ||
      day > 6 ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endMinute < 0 ||
      endMinute > 59 ||
      startHour * 60 + startMinute >= endHour * 60 + endMinute
    ) {
      return null;
    }

    schedules.push({ staffID, day, startHour, startMinute, endHour, endMinute });
  }
  return schedules;
}

export const load: PageServerLoad = async ({ locals }) => {
  const staffID = getStaffID(locals);
  if (!staffID) return error(403);

  const [banner, offerings] = await Promise.all([
    BannerService.get().get(),
    OfferingService.get().getByStaff(staffID),
  ]);
  if (banner === null || offerings === null) return error(500);

  return {
    banner,
    offerings,
    shutdown: ShutdownService.get().getStaffShutdown(staffID),
    schedule: ScheduleService.get().getByStaff(staffID),
    addOfferingForm: await superValidate(zod(offeringSchema), { id: "addOffering" }),
    updateOfferingForm: await superValidate(zod(updateOfferingSchema), { id: "updateOffering" }),
  };
};

export const actions: Actions = {
  insertShutdown: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { success: false });

    const data = await request.formData();
    const start = getRequiredString(data, "start");
    const end = getRequiredString(data, "end");
    if (!start || !end || !isValidDate(start) || !isValidDate(end) || start > end) {
      return fail(400, { success: false });
    }

    const result = await ShutdownService.get().insert(start, end, staffID);
    return result.isOk()
      ? { success: true }
      : fail(serviceErrorStatus(result.error), { success: false });
  },
  deleteShutdown: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { success: false });

    const id = getRequiredString(await request.formData(), "id");
    if (!id) return fail(400, { success: false });

    const deleted = await ShutdownService.get().delete(id, staffID);
    return deleted.isOk()
      ? { success: true }
      : fail(serviceErrorStatus(deleted.error), { success: false });
  },
  addSchedule: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { success: false });

    const data = await request.formData();
    const schedule = parseSchedule(data.get("data"), staffID);
    if (!schedule) return fail(400, { success: false });

    const result = await ScheduleService.get().update(schedule, staffID);
    return result.isOk()
      ? { success: true }
      : fail(serviceErrorStatus(result.error), { success: false });
  },
  deleteSchedule: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { success: false });

    const rawID = getRequiredString(await request.formData(), "id");
    const id = rawID === null ? Number.NaN : Number(rawID);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { success: false });

    const deleted = await ScheduleService.get().delete(id, staffID);
    return deleted.isOk()
      ? { success: true }
      : fail(serviceErrorStatus(deleted.error), { success: false });
  },
  updateBanner: async ({ request, locals }) => {
    if (!getStaffID(locals)) return fail(401, { updatedBanner: false });

    const data = await request.formData();
    const message = getRequiredString(data, "message");
    const visible = getStrictBoolean(data, "visible");
    if (!message || visible === null) return fail(400, { updatedBanner: false });

    const result = await BannerService.get().update(message, visible);
    return result.isOk()
      ? { updatedBanner: true }
      : fail(serviceErrorStatus(result.error), { updatedBanner: false });
  },
  updateOffering: async ({ request, locals }) => {
    const form = await superValidate(request, zod(updateOfferingSchema), { id: "updateOffering" });
    if (!form.valid) return fail(400, { updateOfferingForm: form });

    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { updateOfferingForm: form });

    const response = await OfferingService.get().update({ ...form.data, staffID });
    if (response.isErr()) {
      if (response.error.type !== "storage-error") {
        logger.warn({ offeringID: form.data.id, staffID }, "Offering update denied or not found");
      }
      return fail(serviceErrorStatus(response.error), { updateOfferingForm: form });
    }
    return { updateOfferingForm: form };
  },
  addOffering: async ({ request, locals }) => {
    const form = await superValidate(request, zod(offeringSchema), { id: "addOffering" });
    if (!form.valid) return fail(400, { addOfferingForm: form });

    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { addOfferingForm: form });

    const response = await OfferingService.get().insert({
      id: crypto.randomUUID(),
      ...form.data,
      staffID,
    });
    if (response.isErr()) {
      logger.error({ staffID, errorType: response.error.type }, "Could not add service");
      return fail(serviceErrorStatus(response.error), { addOfferingForm: form });
    }
    return { addOfferingForm: form };
  },
  deleteOffering: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { isDeletingOffering: true, success: false });

    const id = getRequiredString(await request.formData(), "id");
    if (!id) return fail(400, { isDeletingOffering: true, success: false });

    const response = await OfferingService.get().delete(id, staffID);
    if (response.isErr()) {
      return fail(serviceErrorStatus(response.error), {
        isDeletingOffering: true,
        success: false,
      });
    }

    logger.info({ offeringID: id, staffID }, "Offering deleted");
    return { isDeletingOffering: true, success: true };
  },
  toggleStaff: async ({ request, locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { success: false });

    const active = getStrictBoolean(await request.formData(), "active");
    if (active === null) return fail(400, { success: false });

    const result = await StaffService.get().toggleActive(active, staffID);
    return result.isOk()
      ? { success: true }
      : fail(serviceErrorStatus(result.error), { success: false });
  },
  clean: async ({ locals }) => {
    if (!getStaffID(locals)) return fail(401, { success: false });
    await CleanupService.get().deleteExpiredItems();
    return { success: true };
  },
  deleteAvatar: async ({ locals }) => {
    const staffID = getStaffID(locals);
    if (!staffID) return fail(401, { avatarSuccess: false });

    const result = await StaffService.get().deleteAvatar(staffID);
    return result.isOk()
      ? { avatarSuccess: true }
      : fail(serviceErrorStatus(result.error), { avatarSuccess: false });
  },
};
