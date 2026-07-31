import { BASE_URL } from "$env/static/private";
import { signupSchema } from "$lib/modules/zod-schemas";
import { EmailService } from "$lib/server/mailer";
import { PublicTokenService } from "@service/public-token.service.js";
import { UserService } from "@service/user.service.js";
import { redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 as zod } from "sveltekit-superforms/adapters";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/");
  }

  return {
    form: await superValidate(zod(signupSchema)),
    title: "Sign Up -",
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(signupSchema));
    if (!form.valid) {
      return message(form, {
        text: "Le informazioni che hai inserito non sono valide",
        success: false,
      });
    }

    const { email, password, name, phoneNumber } = form.data;

    const userService = UserService.get();
    const user = await userService.insert({
      email,
      password,
      name,
      phoneNumber,
    });

    if (!user.isOk()) {
      if (user.error === "already-existing") {
        return message(form, {
          text: "L'email inserita è già in uso.",
          success: false,
        });
      } else {
        return message(form, {
          text: "Al momento il servizio non risponde. Riprova in seguito.",
          success: false,
        });
      }
    }

    const tokenService = PublicTokenService.get();
    const issuedToken = await tokenService.issue({
      purpose: "account_verification",
      userID: user.value.id,
      expiresAt: user.value.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    if (issuedToken.isErr()) {
      await userService.delete(user.value.id);
      return message(
        form,
        { text: "Impossibile inviare la mail. Riprova più tardi.", success: false },
        { status: 500 },
      );
    }

    const sent = await new EmailService().verifyEmail({
      name,
      to: email,
      link: `${BASE_URL.replace(/\/$/, "")}/account/verify-email/${issuedToken.value}`,
    });

    if (sent.isOk()) {
      return message(form, {
        text: `Abbiamo inviato una mail di verifica a ${email}`,
        success: true,
      });
    } else {
      await tokenService.revoke(issuedToken.value, "account_verification");
      await userService.delete(user.value.id);
      return message(form, {
        text: `Impossibile inviare la mail a ${email}. Riprova più tardi.`,
        success: false,
      });
    }
  },
};
