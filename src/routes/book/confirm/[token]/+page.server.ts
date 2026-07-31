import { PublicTokenService } from "@service/public-token.service";
import { ReservationService } from "@service/reservation.service";
import { error, fail } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const token = await PublicTokenService.get().inspect(params.token, "reservation_confirmation");

  if (token.status === "error") return error(503);

  if (token.status !== "valid" || !token.token.reservationID) {
    return {
      status: token.status === "expired" ? ("expired" as const) : ("invalid" as const),
      reservation: null,
    };
  }

  const reservation = await ReservationService.get().getByID(token.token.reservationID);
  if (reservation.isErr()) {
    if (reservation.error.type === "storage-error") return error(503);
    return { status: "invalid" as const, reservation: null };
  }

  return {
    status: reservation.value.pending ? ("ready" as const) : ("confirmed" as const),
    reservation: reservation.value,
  };
};

export const actions: Actions = {
  default: async ({ params }) => {
    const reservationID = await PublicTokenService.get().confirmReservation(params.token);
    if (reservationID.isErr()) {
      if (reservationID.error.type === "storage-error") return error(503);
      return fail(400, { status: "invalid" as const, reservation: null });
    }

    const reservation = await ReservationService.get().getByID(reservationID.value);
    if (reservation.isErr()) {
      if (reservation.error.type === "storage-error") return error(503);
      return fail(404, { status: "invalid" as const, reservation: null });
    }

    return { status: "confirmed" as const, reservation: reservation.value };
  },
};
