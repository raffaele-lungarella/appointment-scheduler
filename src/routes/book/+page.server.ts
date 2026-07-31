import { BASE_URL } from "$env/static/private";
import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
import { bookSchema } from "$lib/modules/zod-schemas.js";
import { logger } from "$lib/server/logger.js";
import { EmailService } from "$lib/server/mailer.js";
import { formatDate } from "$lib/utils.js";
import { OfferingService } from "@service/offering.service.js";
import { PublicTokenService } from "@service/public-token.service.js";
import { ReservationService } from "@service/reservation.service.js";
import { ScheduleService } from "@service/schedule.service.js";
import { ShutdownService } from "@service/shutdown.service.js";
import { StaffService } from "@service/staff.service.js";
import { error, fail } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ locals }) => {
  const who = !locals.user ? "anonymous" : locals.user.role === "staff" ? "staff" : "usual";

  const [form, currentReservations, shutdown, schedule] = await Promise.all([
    superValidate(
      {
        who,
        staff: "",
        offerings: [],
        date: "",
        startMinute: 0,
        name: "",
        email: "",
        phone: "",
      },
      zod(bookSchema),
      { errors: false },
    ),
    ReservationService.get().getOccupiedSlots(),
    ShutdownService.get().getAll(),
    ScheduleService.get().getAll(),
  ]);

  if (currentReservations.isErr()) return error(503);
  if (!shutdown) return error(500);

  const [offerings, staff] = await Promise.all([
    OfferingService.get().getAll(),
    StaffService.get().getAll(),
  ]);

  if (!offerings || !staff) {
    return error(500);
  }

  return {
    form,
    currentReservations: currentReservations.value,
    shutdown,
    schedule,
    offerings,
    staff,
    user: locals.user,
    title: "Nuova prenotazione -",
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { locals } = event;
    const user = locals.user;

    const form = await superValidate(event, zod(bookSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const data = form.data;
    const reservationService = ReservationService.get();

    let result: Awaited<ReturnType<typeof reservationService.insertByUser>>;

    switch (data.who) {
      case "anonymous":
        if (user) return fail(403, { form });
        result = await reservationService.insertByAnonymous(data);
        break;
      case "usual":
        if (!user || user.role !== "customer") return fail(403, { form });
        result = await reservationService.insertByUser(data, user.account);
        break;
      case "staff":
        if (!user || user.role !== "staff") return fail(403, { form });
        result = await reservationService.insertByStaff(data, user.account);
        break;
    }

    if (result.isErr()) {
      switch (result.error.type) {
        case "conflict":
          return fail(409, { form });
        case "invalid-data":
          return fail(400, { form });
        case "server-error":
          return fail(500, { form });
      }
    }

    const reservation = result.value;
    const confirmationToken = await PublicTokenService.get().issue({
      purpose: "reservation_confirmation",
      reservationID: reservation.id,
      expiresAt: reservation.expiresAt,
    });

    if (confirmationToken.isErr()) {
      await reservationService.delete(reservation.id);
      return fail(500, { form });
    }

    if (data.who === "anonymous") {
      const accessToken = await PublicTokenService.get().issue({
        purpose: "reservation_access",
        reservationID: reservation.id,
        expiresAt: reservation.expiresAt,
      });

      if (accessToken.isErr()) {
        await reservationService.delete(reservation.id);
        return fail(500, { form });
      }

      const sent = await new EmailService().newReservation({
        name: data.name,
        link: `${BASE_URL.replace(/\/$/, "")}/book/confirm/${confirmationToken.value}`,
        staffName: reservation.staff.name,
        serviceNames: reservation.offerings.map((offering) => offering.name),
        date: formatDate(reservation.date),
        hour: formatMinuteOfDay(reservation.startMinute),
        to: data.email,
      });

      logger.warn(sent);

      if (sent.isErr()) {
        logger.error("Could not send email");
        await reservationService.delete(reservation.id);
        return fail(500, { form, email: true });
      }

      // Confirmation credentials are delivered only by email. The access token only allows
      // the browser that created the reservation to display its pending state.
      return {
        id: reservation.id,
        pending: reservation.pending,
        accessToken: accessToken.value,
      };
    }

    return {
      id: reservation.id,
      pending: reservation.pending,
      confirmationToken: confirmationToken.value,
    };
  },
};
