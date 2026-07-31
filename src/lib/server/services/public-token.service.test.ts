import { describe, expect, it } from "vitest";

import {
  generatePublicToken,
  hashPublicToken,
  isIssuePublicTokenInput,
  publicTokenPurposes,
} from "./public-token.service";

describe("public token primitives", () => {
  it.each(publicTokenPurposes)("generates URL-safe %s tokens with a purpose prefix", (purpose) => {
    const token = generatePublicToken(purpose);

    expect(token).toMatch(/^[a-z]{2}_[A-Za-z0-9_-]{43}$/);
    expect(encodeURIComponent(token)).toBe(token);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generatePublicToken("password_reset")),
    );

    expect(tokens.size).toBe(100);
  });

  it.each([
    { purpose: "account_verification", userID: "user-1", expiresAt: new Date() },
    { purpose: "password_reset", userID: "user-1", expiresAt: new Date() },
    {
      purpose: "email_change",
      userID: "user-1",
      pendingEmail: "new@example.com",
      expiresAt: new Date(),
    },
    { purpose: "reservation_access", reservationID: "reservation-1", expiresAt: new Date() },
    {
      purpose: "reservation_confirmation",
      reservationID: "reservation-1",
      expiresAt: new Date(),
    },
  ])("accepts the valid $purpose structure", (input) => {
    expect(isIssuePublicTokenInput(input)).toBe(true);
  });

  it.each([
    { purpose: "password_reset", expiresAt: new Date() },
    { purpose: "password_reset", userID: "", expiresAt: new Date() },
    {
      purpose: "password_reset",
      userID: "user-1",
      reservationID: "reservation-1",
      expiresAt: new Date(),
    },
    { purpose: "email_change", userID: "user-1", expiresAt: new Date() },
    {
      purpose: "reservation_access",
      reservationID: "reservation-1",
      pendingEmail: "unexpected@example.com",
      expiresAt: new Date(),
    },
    { purpose: "unknown", userID: "user-1", expiresAt: new Date() },
    { purpose: "password_reset", userID: "user-1", expiresAt: new Date("invalid") },
  ])("rejects a structurally invalid token input", (input) => {
    expect(isIssuePublicTokenInput(input)).toBe(false);
  });

  it("hashes tokens deterministically without retaining the raw token", () => {
    const token = "pr_example-token";
    const hash = hashPublicToken(token);

    expect(hash).toBe(hashPublicToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashPublicToken(`${token}-different`)).not.toBe(hash);
  });
});
