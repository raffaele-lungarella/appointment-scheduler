import { loginSchema, recoverPasswordSchema } from "$lib/modules/zod-schemas";
import * as auth from "$lib/server/auth";
import { EmailService } from "$lib/server/mailer";
import { PublicTokenService } from "@service/public-token.service.js";
import { UserService } from "@service/user.service.js";
import { fail, redirect } from "@sveltejs/kit";
import { verify } from "argon2";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/");
  }

  return {
    form: await superValidate(zod(loginSchema), { id: "login-form" }),
    recoverForm: await superValidate(zod(recoverPasswordSchema), { id: "recover-password-form" }),
    title: "Sign In -",
  };
};

export const actions: Actions = {
  login: async (event) => {
    const form = await superValidate(event, zod(loginSchema), { id: "login-form" });
    if (!form.valid) {
      return fail(400, {
        success: false,
        message: "I dati inseriti non sono validi",
        form,
      });
    }

    const userResult = await UserService.get().getByEmail(form.data.email);

    if (userResult.isErr() && userResult.error.type === "storage-error") {
      return fail(503, {
        success: false,
        message: "Al momento non è possibile accedere. Riprova più tardi.",
        form,
      });
    }

    if (userResult.isErr() || !userResult.value.account.verifiedEmail) {
      return fail(400, {
        success: false,
        message: "Email o password errati",
        form,
      });
    }

    const existingUser = userResult.value;
    const validPassword = await verify(existingUser.account.passwordHash, form.data.password, {});

    if (!validPassword) {
      return fail(400, {
        success: false,
        message: "Email o password errati",
        form,
      });
    }

    const sessionToken = auth.generateSessionToken();
    let session;
    try {
      session = await auth.createSession(sessionToken, existingUser.account.id);
    } catch {
      return fail(500, {
        success: false,
        message: "Al momento non è possibile accedere. Riprova più tardi.",
        form,
      });
    }
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

    if (existingUser.role === "staff") {
      return redirect(302, "/dashboard");
    }
    return redirect(302, "/");
  },
  recoverPassword: async (event) => {
    const recoverForm = await superValidate(event, zod(recoverPasswordSchema), {
      id: "recover-password-form",
    });
    if (!recoverForm.valid) {
      return fail(400, { recoverForm });
    }

    const email = recoverForm.data.email.toLowerCase().trim();
    const userResult = await UserService.get().getByEmail(email);

    if (userResult.isErr() && userResult.error.type === "storage-error") {
      return message(
        recoverForm,
        { success: false, text: "Impossibile inviare l'email. Riprova più tardi." },
        { status: 503 },
      );
    }

    if (userResult.isErr()) {
      return message(recoverForm, {
        success: true,
        text: "Ti arriverà una mail per aggiornare la password.",
      });
    }

    const user = userResult.value;
    const tokenService = PublicTokenService.get();
    const issuedToken = await tokenService.issue({
      purpose: "password_reset",
      userID: user.account.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    if (issuedToken.isErr()) {
      return message(
        recoverForm,
        { success: false, text: "Impossibile inviare l'email. Riprova più tardi." },
        { status: 500 },
      );
    }

    const sent = await new EmailService().recoverPassword({
      name: user.account.name,
      to: email,
      link: new URL(`/account/reset-password/${issuedToken.value}`, event.url.origin).href,
    });

    if (!sent.isOk()) {
      await tokenService.revoke(issuedToken.value, "password_reset");
      return message(
        recoverForm,
        { success: false, text: "Impossibile inviare l'email. Riprova più tardi." },
        { status: 500 },
      );
    }

    return message(recoverForm, {
      success: true,
      text: "Ti arriverà una mail per aggiornare la password del tuo account.",
    });
  },
};
