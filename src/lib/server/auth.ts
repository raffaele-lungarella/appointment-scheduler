import { DAY_IN_MS } from "$lib/constants";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserSession } from "$lib/server/domain";
import { createLogger } from "$lib/server/logger";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";
import { SessionService } from "@service/session.service";
import { UserService } from "@service/user.service";
import type { RequestEvent } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

const log = createLogger("auth");

export const sessionCookieName = "auth-session";

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = encodeBase64url(bytes);
  return token;
}

export async function createSession(token: string, userID: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: table.NewSessionRow = {
    id: sessionId,
    userID,
    expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
  };
  const inserted = await SessionService.get().insert(session);
  if (!inserted) {
    log.error({ sessionId, userID }, "session creation failed");
    throw new Error("Could not create session");
  }

  log.info({ sessionId, userID }, "session created");
  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<UserSession | { session: null; user: null }> {
  const sessionID = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const sessionResult = await SessionService.get().getByID(sessionID);

  if (sessionResult.isErr()) {
    if (sessionResult.error.type === "not-found") {
      log.debug({ sessionID }, "session not found");
      return { session: null, user: null };
    }
    log.error({ sessionID }, "session lookup failed");
    throw new Error("Could not validate session");
  }

  const sessionData = sessionResult.value;
  const userResult = await UserService.get().getByID(sessionData.userID);

  if (userResult.isErr()) {
    if (userResult.error.type === "not-found") {
      log.warn({ sessionID, userID: sessionData.userID }, "session valid but user not found");
      return { session: null, user: null };
    }
    log.error({ sessionID, userID: sessionData.userID }, "session user lookup failed");
    throw new Error("Could not validate session");
  }

  const userData = userResult.value;
  const result: UserSession = {
    session: sessionData,
    user: userData,
  };

  const { session } = result;

  const sessionExpired = Date.now() >= session.expiresAt.getTime();
  if (sessionExpired) {
    log.info({ sessionID, userID: userData.account.id }, "session expired, deleting");
    await SessionService.get().delete(session.id);
    return { session: null, user: null };
  }

  const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
  if (renewSession) {
    session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
    log.info(
      { sessionID, userID: userData.account.id, expiresAt: session.expiresAt },
      "session renewed",
    );
    await db
      .update(table.session)
      .set({ expiresAt: session.expiresAt })
      .where(eq(table.session.id, session.id));
  }

  log.debug({ sessionID, userID: userData.account.id }, "session valid");
  return result;
}

export async function invalidateSession(sessionId: string) {
  await SessionService.get().delete(sessionId);
  log.info({ sessionId }, "session invalidated");
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
