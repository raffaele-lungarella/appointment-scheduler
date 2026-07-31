import { db } from "$lib/server/db";
import type { Database } from "$lib/server/db/client";
import { sql } from "drizzle-orm";

export type RateLimitPolicy = {
  id: "login" | "signup" | "password-recovery" | "booking";
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; retryAfterSeconds: 0 }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

const policies = {
  login: { id: "login", limit: 10, windowMs: 15 * 60_000 },
  signup: { id: "signup", limit: 5, windowMs: 60 * 60_000 },
  "password-recovery": { id: "password-recovery", limit: 5, windowMs: 60 * 60_000 },
  booking: { id: "booking", limit: 10, windowMs: 15 * 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * Selects only known SvelteKit form actions. The action is read through URLSearchParams rather
 * than by parsing the raw query string, so unrelated parameters cannot alter the limiter bucket.
 */
export function getRateLimitPolicy(
  method: string,
  routeID: string | null,
  searchParams: URLSearchParams,
): RateLimitPolicy | null {
  if (method !== "POST" || !routeID) return null;

  const action = searchParams.get("/");
  if (routeID === "/(auth)/login" && action === "login") return policies.login;
  if (routeID === "/(auth)/login" && action === "recoverPassword") {
    return policies["password-recovery"];
  }
  if (routeID === "/(auth)/signup" && action === null) return policies.signup;
  if (routeID === "/book" && action === null) return policies.booking;
  return null;
}

async function hashKey(clientAddress: string, policyID: RateLimitPolicy["id"], hashSecret: string) {
  if (hashSecret.length < 32)
    throw new Error("RATE_LIMIT_HASH_SECRET must be at least 32 characters");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hashSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${policyID}\0${clientAddress}`),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Atomically increments a SQLite/Turso fixed-window counter. Only a one-way hash is persisted;
 * raw client addresses and form values never reach this table.
 */
export async function consumeRateLimit(
  clientAddress: string,
  policy: RateLimitPolicy,
  options: { hashSecret: string; database?: Database; now?: Date },
): Promise<RateLimitResult> {
  const database = options.database ?? db;
  const nowMs = (options.now ?? new Date()).getTime();
  const windowStartMs = Math.floor(nowMs / policy.windowMs) * policy.windowMs;
  const windowStartSeconds = Math.floor(windowStartMs / 1000);
  const windowEndMs = windowStartMs + policy.windowMs;
  const expiresAtSeconds = Math.floor((windowEndMs + policy.windowMs) / 1000);
  const keyHash = await hashKey(clientAddress, policy.id, options.hashSecret);

  // This raw SQL bypasses Drizzle's timestamp encoder, so bind Unix seconds explicitly.
  const rows = await database.all<{ requestCount: number }>(sql`
    INSERT INTO rate_limit (key_hash, window_start, request_count, expires_at)
    VALUES (${keyHash}, ${windowStartSeconds}, 1, ${expiresAtSeconds})
    ON CONFLICT (key_hash, window_start) DO UPDATE SET
      request_count = rate_limit.request_count + 1,
      expires_at = excluded.expires_at
    RETURNING request_count AS requestCount
  `);
  const requestCount = Number(rows[0]?.requestCount);
  if (!Number.isFinite(requestCount)) throw new Error("Rate limiter increment returned no count");

  if (requestCount <= policy.limit) {
    return { allowed: true, remaining: policy.limit - requestCount, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000)),
  };
}
