import { signupSchema } from "$lib/modules/zod-schemas";
import { redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { UserService } from "@service/user.service.js";
import { BASE_URL } from "$env/static/private";
import { EmailService } from "$lib/server/mailer";

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
		const user = await userService.insert({ email, password, name, phoneNumber });

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

		const sent = await new EmailService().verifyEmail({
			name,
			to: email,
			link: `${BASE_URL}?user=${user.value.id}`,
		});

		if (sent.isOk()) {
			return message(form, {
				text: `Abbiamo inviato una mail di verifica a ${email}`,
				success: true,
			});
		} else {
			return message(form, {
				text: `Impossibile inviare la mail a ${email}. Riprova più tardi.`,
				success: false,
			});
		}
	},
};
