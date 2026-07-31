import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import * as auth from "$lib/server/auth.js";
import { getLegacyRedirect } from "$lib/server/legacy-redirects";
import { logger } from "$lib/server/logger";
import { toSessionUserDTO } from "$lib/server/mappers/user.mapper";
import { consumeRateLimit, getRateLimitPolicy } from "$lib/server/rate-limit";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const handleLogging: Handle = async ({ event, resolve }) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  const response = await resolve(event);

  const routeID = event.route.id;
  const containsPublicToken = routeID?.includes("[token]") || routeID === "/book/pending/[id]";

  logger.info({
    requestId,
    method: event.request.method,
    path:
      containsPublicToken || routeID?.includes("[reservation=uuid]") ? routeID : event.url.pathname,
    status: response.status,
    durationMs: Date.now() - start,
    userId: event.locals.user?.account.id ?? null,
  });

  return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
  const routeID = event.route.id;
  const isProtected = routeID?.startsWith("/(protected)") ?? false;
  const isAdmin = routeID?.startsWith("/(admin)") || routeID?.startsWith("/(protected)/(admin)");
  const sessionToken = event.cookies.get(auth.sessionCookieName);

  if (!sessionToken) {
    event.locals.user = null;
    event.locals.session = null;

    // Check if route requires authentication
    if (isProtected || isAdmin) {
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

  event.locals.user = user ? toSessionUserDTO(user) : null;
  event.locals.session = session ? { id: session.id } : null;

  if ((isProtected || isAdmin) && !user) {
    redirect(303, "/login");
  }

  if (isAdmin && user?.role !== "staff") {
    redirect(303, "/");
  }

  return resolve(event);
};

const handleRateLimit: Handle = async ({ event, resolve }) => {
  if (event.request.method !== "POST") return resolve(event);

  const policy = getRateLimitPolicy(event.request.method, event.route.id, event.url.searchParams);
  if (!policy) return resolve(event);

  try {
    // getClientAddress() relies on the deployed SvelteKit adapter/proxy being configured to trust
    // only the platform's forwarding headers. Do not derive identity from user-supplied headers here.
    const result = await consumeRateLimit(event.getClientAddress(), policy, {
      hashSecret: env.RATE_LIMIT_HASH_SECRET ?? "",
    });
    if (!result.allowed) {
      return new Response("Too many requests", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(result.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (error) {
    // Fail closed for account and booking mutations: temporary unavailability is safer than
    // silently disabling abuse protection when Turso/SQLite or client-address resolution fails.
    logger.error({ err: error, policy: policy.id }, "Rate limiter unavailable");
    return new Response("Service temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return resolve(event);
};

const handleOldRoutes: Handle = async ({ event, resolve }) => {
  const legacyRedirect = getLegacyRedirect(event.url, !building);
  if (legacyRedirect) {
    redirect(legacyRedirect.status, legacyRedirect.location);
  }

  return resolve(event);
};

export const handle: Handle = sequence(handleOldRoutes, handleRateLimit, handleAuth, handleLogging);
