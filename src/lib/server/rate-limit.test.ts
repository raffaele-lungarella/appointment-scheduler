import { describe, expect, it } from "vitest";

import { getRateLimitPolicy } from "./rate-limit";

describe("getRateLimitPolicy", () => {
  it.each([
    ["/(auth)/login", "/=login", "login"],
    ["/(auth)/login", "foo=bar&%2F=recoverPassword", "password-recovery"],
    ["/(auth)/signup", "", "signup"],
    ["/book", "", "booking"],
  ])("limits %s with query %s", (routeID, query, policyID) => {
    const policy = getRateLimitPolicy("POST", routeID, new URLSearchParams(query));
    expect(policy?.id).toBe(policyID);
  });

  it.each([
    ["GET", "/(auth)/login", "/=login"],
    ["POST", "/(auth)/login", "/=notAnAction"],
    ["POST", "/(auth)/signup", "/=login"],
    ["POST", "/book/confirm/[token]", ""],
    ["POST", null, ""],
  ])("does not limit unmatched requests", (method, routeID, query) => {
    expect(getRateLimitPolicy(method, routeID, new URLSearchParams(query))).toBeNull();
  });
});
