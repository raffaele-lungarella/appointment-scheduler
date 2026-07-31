import { PublicTokenService } from "@service/public-token.service";
import { error } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user || !locals.session) {
    return { status: "unauthorized" as const };
  }

  const token = await PublicTokenService.get().inspect(params.token, "email_change");

  if (token.status === "error") return error(503);
  if (token.status !== "valid") {
    return {
      status:
        token.status === "expired" || token.status === "consumed"
          ? ("expired" as const)
          : ("invalid" as const),
    };
  }

  return {
    status:
      token.token.userID === locals.user.account.id ? ("ready" as const) : ("forbidden" as const),
  };
};

export const actions: Actions = {
  default: async ({ locals, params }) => {
    if (!locals.user || !locals.session) {
      return { status: "unauthorized" as const };
    }

    const tokenService = PublicTokenService.get();
    const token = await tokenService.inspect(params.token, "email_change");
    if (token.status === "error") return error(503);
    if (token.status !== "valid") {
      return {
        status:
          token.status === "expired" || token.status === "consumed"
            ? ("expired" as const)
            : ("invalid" as const),
      };
    }
    if (token.token.userID !== locals.user.account.id) {
      return { status: "forbidden" as const };
    }

    const updatedUser = await tokenService.confirmEmailChange(
      params.token,
      locals.user.account.id,
      locals.session.id,
    );
    if (updatedUser.isErr()) {
      if (updatedUser.error.type === "storage-error") return error(503);
      return { status: "expired" as const };
    }

    return { status: "confirmed" as const, email: updatedUser.value.email };
  },
};
