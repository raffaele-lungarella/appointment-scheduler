import type { RequestEvent } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { DAY_IN_MS } from "$lib/constants";
import { SessionService } from "@service/session.service";
import { UserService } from "@service/user.service";
import type { UserSession } from "@types";

export const sessionCookieName = "auth-session";

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userID: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.DBSession = {
		id: sessionId,
		userID,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
	};
	await SessionService.get().insert(session);
	return session;
}

export async function validateSessionToken(
	token: string,
): Promise<UserSession | { session: null; user: null }> {
	const sessionID = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const sessionData = await SessionService.get().getByID(sessionID);

	if (!sessionData) {
		return { session: null, user: null };
	}

	const userService = UserService.get();
	const userData = await userService.getByID(sessionData.userID);

	if (!userData) {
		return { session: null, user: null };
	}

	const result: UserSession = {
		session: sessionData,
		user: userData,
	};

	const { session } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return result;
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: "/",
		httpOnly: true,
		sameSite: true,
		secure: true,
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: "/",
		httpOnly: true,
		sameSite: true,
		secure: true,
	});
}
