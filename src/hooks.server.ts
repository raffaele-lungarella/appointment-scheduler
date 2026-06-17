import { redirect, type Handle } from "@sveltejs/kit";
import * as auth from "$lib/server/auth.js";

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		// Check if route requires authentication
		if (event.route.id?.startsWith("/(protected)") || event.route.id?.startsWith("/(admin)")) {
			redirect(303, "/login");
		}

		return resolve(event);
	}

	// Validate session token
	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	// Check admin access after validating session
	if (event.route.id?.startsWith("/(admin)")) {
		if (!user) {
			redirect(303, "/login");
		}
		if (user.role !== "staff") {
			redirect(303, "/");
		}
	}

	return resolve(event);
};

export const handle: Handle = handleAuth;
