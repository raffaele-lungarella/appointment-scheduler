import { changePasswordSchema } from "$lib/modules/zod-schemas";
import * as auth from "$lib/server/auth";
import { logger } from "$lib/server/logger";
import { PublicTokenService } from "@service/public-token.service";
import { UserService } from "@service/user.service";
import { error, fail, redirect } from "@sveltejs/kit";
import { hash } from "argon2";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const changePasswordForm = await superValidate(zod(changePasswordSchema));
  const resetToken = await PublicTokenService.get().inspect(params.token, "password_reset");

  if (resetToken.status === "error") return error(503);

  if (resetToken.status !== "valid" || !resetToken.token.userID) {
    return {
      status:
        resetToken.status === "expired" || resetToken.status === "consumed"
          ? ("expired" as const)
          : ("invalid" as const),
      changePasswordForm,
    };
  }

  return { status: "ready" as const, changePasswordForm };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(changePasswordSchema));
    if (!form.valid) {
      return fail(400, { changePasswordForm: form });
    }

    const passwordHash = await hash(form.data.newPassword, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const userID = await PublicTokenService.get().resetPassword(event.params.token, passwordHash);

    if (userID.isErr()) {
      if (userID.error.type === "storage-error") return error(503);
      return message(
        form,
        { success: false, text: "La richiesta non è valida o è scaduta." },
        { status: 400 },
      );
    }

    const user = await UserService.get().getByID(userID.value);
    if (user.isErr()) {
      if (user.error.type === "storage-error") return error(503);
      return redirect(303, "/login");
    }
    if (!user.value.account.verifiedEmail) return redirect(303, "/login");

    const sessionToken = auth.generateSessionToken();
    try {
      const session = await auth.createSession(sessionToken, user.value.account.id);
      auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    } catch (error) {
      logger.error({ err: error, userId: userID.value }, "Could not create post-reset session");
      return redirect(303, "/login");
    }

    redirect(303, user.value.role === "staff" ? "/dashboard" : "/");
  },
};
