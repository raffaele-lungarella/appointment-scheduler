import { ok } from "$lib/modules/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tokenService = vi.hoisted(() => ({
  inspect: vi.fn(),
  confirmEmailChange: vi.fn(),
}));

vi.mock("@service/public-token.service", () => ({
  PublicTokenService: { get: () => tokenService },
}));

import { actions, load } from "../../routes/account/confirm-email-change/[token]/+page.server";

type LoadEvent = Parameters<NonNullable<typeof load>>[0];
type ActionEvent = Parameters<NonNullable<(typeof actions)["default"]>>[0];

const event = {
  params: { token: "ec_token" },
  locals: {
    user: { role: "customer", account: { id: "user-1" } },
    session: { id: "session-1" },
  },
};

describe("email change confirmation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only inspects authorization on GET", async () => {
    tokenService.inspect.mockResolvedValue({
      status: "valid",
      token: { userID: "user-1" },
    });

    await expect(load(event as unknown as LoadEvent)).resolves.toEqual({ status: "ready" });
    expect(tokenService.inspect).toHaveBeenCalledWith("ec_token", "email_change");
    expect(tokenService.confirmEmailChange).not.toHaveBeenCalled();
  });

  it("rejects another user's token without mutating on POST", async () => {
    tokenService.inspect.mockResolvedValue({
      status: "valid",
      token: { userID: "user-2" },
    });

    await expect(actions.default(event as unknown as ActionEvent)).resolves.toEqual({
      status: "forbidden",
    });
    expect(tokenService.confirmEmailChange).not.toHaveBeenCalled();
  });

  it("confirms the change atomically and returns the updated email on POST", async () => {
    tokenService.inspect.mockResolvedValue({
      status: "valid",
      token: { userID: "user-1" },
    });
    tokenService.confirmEmailChange.mockResolvedValue(ok({ email: "nuova@example.com" }));

    await expect(actions.default(event as unknown as ActionEvent)).resolves.toEqual({
      status: "confirmed",
      email: "nuova@example.com",
    });
    expect(tokenService.confirmEmailChange).toHaveBeenCalledWith("ec_token", "user-1", "session-1");
  });
});
