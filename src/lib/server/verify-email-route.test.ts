import { ok } from "$lib/modules/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tokenService = vi.hoisted(() => ({
  inspect: vi.fn(),
  verifyAccount: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  generateSessionToken: vi.fn(() => "session-token"),
  createSession: vi.fn(),
  setSessionTokenCookie: vi.fn(),
}));

vi.mock("@service/public-token.service", () => ({
  PublicTokenService: { get: () => tokenService },
}));
vi.mock("$lib/server/auth", () => auth);

import { actions, load } from "../../routes/account/verify-email/[token]/+page.server";

type LoadEvent = Parameters<NonNullable<typeof load>>[0];
type ActionEvent = Parameters<NonNullable<(typeof actions)["default"]>>[0];

const event = { params: { token: "av_token" } };

describe("email verification route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only inspects a valid token on GET", async () => {
    tokenService.inspect.mockResolvedValue({
      status: "valid",
      token: { userID: "user-1" },
    });

    await expect(load(event as unknown as LoadEvent)).resolves.toEqual({ status: "ready" });
    expect(tokenService.inspect).toHaveBeenCalledWith("av_token", "account_verification");
    expect(tokenService.verifyAccount).not.toHaveBeenCalled();
    expect(auth.createSession).not.toHaveBeenCalled();
  });

  it("verifies and creates a session on POST", async () => {
    const expiresAt = new Date("2030-01-01T00:00:00Z");
    tokenService.verifyAccount.mockResolvedValue(ok({ id: "user-1" }));
    auth.createSession.mockResolvedValue({ expiresAt });

    const postEvent = { ...event, cookies: {} };
    await expect(actions.default(postEvent as unknown as ActionEvent)).resolves.toEqual({
      status: "already-verified",
    });
    expect(tokenService.verifyAccount).toHaveBeenCalledWith("av_token");
    expect(auth.createSession).toHaveBeenCalledWith("session-token", "user-1");
    expect(auth.setSessionTokenCookie).toHaveBeenCalledWith(postEvent, "session-token", expiresAt);
  });
});
