import { expired } from "$lib/utils";
import { PublicTokenService } from "@service/public-token.service";
import { ReservationService } from "@service/reservation.service";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const token = await PublicTokenService.get().inspect(params.id, "reservation_access");

  if (token.status !== "valid" || !token.token.reservationID) {
    return {
      success: false,
      reservation: null,
      error: token.status === "expired" ? ("expired" as const) : ("invalid" as const),
    };
  }

  const reservation = await ReservationService.get().getByID(token.token.reservationID);

  if (reservation.isErr()) {
    if (reservation.error.type === "storage-error") return error(503);
    return { success: false, reservation: null, error: "invalid" as const };
  }

  if (reservation.value.pending && expired(reservation.value.expiresAt.getTime())) {
    return { success: false, reservation: null, error: "expired" as const };
  }

  return {
    success: true,
    reservation: reservation.value,
    error: null,
  };
};
