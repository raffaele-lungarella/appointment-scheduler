import { logger } from "$lib/server/logger";
import { ReservationService } from "@service/reservation.service";
import { error, fail, redirect, type Actions } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, "/login");
  }

  const reservations = await ReservationService.get().getByUser(
    locals.user.account.id,
    locals.user.account.email,
  );

  if (reservations.isErr()) return error(503);

  logger.info(`Retrieved ${reservations.value.length} reservations`);

  return { reservations: reservations.value, title: "Prenotazioni -" };
};

export const actions: Actions = {
  delete: async ({ locals, request }) => {
    if (!locals.user) {
      redirect(303, "/login");
    }

    const data = await request.formData();
    const id = data.get("id")?.toString();

    if (!id) {
      return fail(400, { success: false });
    }

    const res = await ReservationService.get().deleteByUser(
      id,
      locals.user.account.id,
      locals.user.account.email,
    );

    if (res.isErr()) {
      return fail(res.error.type === "not-found" ? 404 : 503, { success: false });
    }

    return { res: res.value };
  },
  deleteBatch: async ({ locals, request }) => {
    if (!locals.user) {
      redirect(303, "/login");
    }

    const data = await request.formData();
    const ids = data
      .getAll("ids")
      .map((id) => id.toString())
      .filter(Boolean);

    if (ids.length === 0) {
      return fail(400, { success: false });
    }

    const res = await ReservationService.get().deleteManyByUser(
      ids,
      locals.user.account.id,
      locals.user.account.email,
    );

    if (res.isErr()) return fail(503, { success: false });

    return { res: res.value, deleted: res.value.affectedRows };
  },
};
