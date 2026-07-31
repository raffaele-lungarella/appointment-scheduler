import { describe, expect, it } from "vitest";

import { _isAuthorizedCronRequest } from "./+server";

describe("cleanup cron authentication", () => {
  it("accepts only an exact bearer secret", () => {
    const request = (authorization?: string) =>
      new Request("http://localhost/api/internal/cleanup", {
        headers: authorization ? { authorization } : undefined,
      });

    expect(_isAuthorizedCronRequest(request("Bearer cron-secret"), "cron-secret")).toBe(true);
    expect(_isAuthorizedCronRequest(request("Bearer wrong"), "cron-secret")).toBe(false);
    expect(_isAuthorizedCronRequest(request("Basic cron-secret"), "cron-secret")).toBe(false);
    expect(_isAuthorizedCronRequest(request(), "cron-secret")).toBe(false);
  });
});
