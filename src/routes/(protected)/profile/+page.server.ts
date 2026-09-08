import { profileChangeEmailSchema, profileChangePasswordSchema } from "$lib/modules/zod-schemas";
import * as auth from "$lib/server/auth";
import { logger } from "$lib/server/logger";
import { EmailService } from "$lib/server/mailer";
import { getNumber, getString } from "$lib/utils";
import { PasswordRecoverService } from "@service/password-recover.service.js";
import { PublicTokenService } from "@service/public-token.service.js";
import { ReservationService } from "@service/reservation.service.js";
import { SessionService } from "@service/session.service.js";
import { StaffService } from "@service/staff.service";
import { UserService } from "@service/user.service.js";
import { fail, redirect } from "@sveltejs/kit";
import { hash, verify } from "argon2";
import { message, setError, superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(301, "/login");
  }

  const changeEmailForm = await superValidate(zod(profileChangeEmailSchema));
  const changePasswordForm = await superValidate(zod(profileChangePasswordSchema));

  return {
    user: locals.user,
    title: "Profilo -",
    updatedEmail: null,
    changeEmailForm,
    changePasswordForm,
  };
};

export const actions: Actions = {
  logout: async (event) => {
    logger.info("Logging out...");
    if (!event.locals.session) {
      return fail(401);
    }

    await auth.invalidateSession(event.locals.session.id);
    auth.deleteSessionTokenCookie(event);

    return redirect(302, "/");
  },

  updateAvatar: async ({ request, locals }) => {
    if (!locals.user) return { avatarSuccess: false };

    const data = await request.formData();
    const avatarBase64 = getString(data, "avatarBase64");
    const avatarOriginal = getString(data, "avatarOriginal");
    const offsetX = getNumber(data, "offsetX");
    const offsetY = getNumber(data, "offsetY");
    const displayScale = getNumber(data, "displayScale");

    if (
      !avatarBase64 ||
      !avatarOriginal ||
      !Number.isFinite(offsetX) ||
      !Number.isFinite(offsetY) ||
      !Number.isFinite(displayScale) ||
      displayScale <= 0
    ) {
      return fail(400, { avatarSuccess: false });
    }

    const result = await StaffService.get().updateAvatar(
      locals.user.account.id,
      avatarBase64,
      avatarOriginal,
      offsetX,
      offsetY,
      displayScale,
    );
    return result ? { avatarSuccess: true } : fail(400, { avatarSuccess: false });
  },
  deleteAvatar: async ({ locals }) => {
    if (!locals.user) return { avatarSuccess: false };

    const result = await StaffService.get().deleteAvatar(locals.user.account.id);
    return result ? { avatarSuccess: true } : fail(500, { avatarSuccess: false });
  },
  updateInfo: async ({ locals, request, url }) => {
    const userService = UserService.get();

    if (!locals.session || !locals.user) {
      return fail(401, { success: false });
    }

    const formData = await request.formData();
    const phone = getString(formData, "phone").trim();
    const name = getString(formData, "name").trim();

    if (!name) {
      return fail(400, { success: false });
    }

    if (locals.user.account.phoneNumber === phone && locals.user.account.name === name) {
      redirect(302, url.pathname);
    }

    const updated = await userService.updateInfo(locals.user.account.id, name, phone);
    if (!updated) {
      return fail(500, { success: false });
    }

    redirect(302, url.pathname);
  },
  changeEmail: async ({ locals, request, url }) => {
    if (!locals.session || !locals.user) {
      return fail(401);
    }

    const form = await superValidate(request, zod(profileChangeEmailSchema));
    if (!form.valid) {
      return fail(400, { changeEmailForm: form });
    }

    const email = form.data.email.toLowerCase().trim();

    const userService = UserService.get();
    const existingUser = await userService.getByEmail(email);

    if (existingUser.isErr() && existingUser.error.type === "storage-error") {
      return fail(503, { changeEmailForm: form });
    }
    if (existingUser.isOk() && existingUser.value.account.verifiedEmail) {
      return setError(form, "email", "Email non disponibile");
    }

    const tokenService = PublicTokenService.get();
    const emailChangeToken = await tokenService.issue({
      purpose: "email_change",
      userID: locals.user.account.id,
      pendingEmail: email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    if (emailChangeToken.isErr()) {
      return message(
        form,
        { success: false, text: "Impossibile cambiare la mail. Riprova più tardi." },
        { status: 400 },
      );
    }

    const sent = await new EmailService().changeEmail({
      name: locals.user.account.name,
      to: email,
      link: new URL(`/account/confirm-email-change/${emailChangeToken.value}`, url.origin).href,
    });

    if (sent.isErr()) {
      await tokenService.revoke(emailChangeToken.value, "email_change");

      return message(
        form,
        { success: false, text: "Impossibile cambiare email. Riprova più tardi" },
        { status: 500 },
      );
    }

    return message(form, {
      success: true,
      text: "Controlla la tua casella di posta.",
    });
  },
  deleteAccount: async (event) => {
    const user = event.locals.user;
    const session = event.locals.session;

    if (!user || !session) {
      logger.warn("Cannot delete account");
      return fail(403);
    }

    const userService = UserService.get();
    const sessionService = SessionService.get();
    const passwordRecoverService = PasswordRecoverService.get();
    const publicTokenService = PublicTokenService.get();
    const reservationService = ReservationService.get();

    logger.warn("Deleting account of user: " + user.account.email);

    // Delete all related data
    await sessionService.deleteAllByUserID(user.account.id);
    const deletedReservations = await reservationService.deleteAllByUser(
      user.account.id,
      user.account.email,
    );
    if (deletedReservations.isErr()) return fail(503);

    if (user.role === "staff") {
      const deletedStaffReservations = await reservationService.deleteAllByStaff(user.account.id);
      if (deletedStaffReservations.isErr()) return fail(503);
    }

    await passwordRecoverService.deleteByUserID(user.account.id);
    await publicTokenService.deleteByUserID(user.account.id);

    const res = await userService.delete(user.account.id);

    if (res) {
      logger.info("Successfully deleted account of user: " + res.email);
      auth.deleteSessionTokenCookie(event);

      return redirect(302, "/");
    } else {
      logger.error("Error while deleting account of user: " + user.account.email);
      return fail(500);
    }
  },
  changePassword: async (event) => {
    const user = event.locals.user;
    const session = event.locals.session;

    if (!user || !session) {
      return fail(401);
    }

    const form = await superValidate(event, zod(profileChangePasswordSchema));
    if (!form.valid) {
      return fail(400, { changePasswordForm: form });
    }

    const { oldPassword, newPassword } = form.data;
    const serverUser = await UserService.get().getByID(user.account.id);
    if (serverUser.isErr()) {
      return fail(serverUser.error.type === "storage-error" ? 503 : 401, {
        changePasswordForm: form,
      });
    }

    const validPassword = await verify(serverUser.value.account.passwordHash, oldPassword, {});
    if (!validPassword) {
      return message(
        form,
        { success: false, text: "La password attuale non è corretta." },
        { status: 400 },
      );
    }

    if (newPassword === oldPassword) {
      return message(
        form,
        {
          success: false,
          text: "La nuova password deve essere diversa da quella attuale.",
        },
        { status: 400 },
      );
    }

    const passwordHash = await hash(newPassword, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const response = await SessionService.get().updatePasswordAndRevokeOtherSessions(
      user.account.id,
      passwordHash,
      session.id,
    );
    if (!response) {
      return message(
        form,
        {
          success: false,
          text: "Impossibile aggiornare la password. Riprova più tardi.",
        },
        { status: 500 },
      );
    }

    return message(form, {
      success: true,
      text: "Password aggiornata con successo!",
    });
  },
};
