import type { User } from "$lib/server/domain";
import { describe, expect, it } from "vitest";

import { toSessionUserDTO } from "./user.mapper";

const sensitiveAccountData = {
  passwordHash: "argon2-hash",
  expiresAt: new Date("2030-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

const account = {
  id: "user-1",
  name: "Mario Rossi",
  phoneNumber: null,
  email: "mario@example.com",
  verifiedEmail: true,
  ...sensitiveAccountData,
};

describe("session user DTO serialization", () => {
  it("whitelists safe customer account fields", () => {
    const user: User = { role: "customer", account };

    expect(toSessionUserDTO(user)).toEqual({
      role: "customer",
      account: {
        id: "user-1",
        name: "Mario Rossi",
        phoneNumber: null,
        email: "mario@example.com",
        verifiedEmail: true,
      },
    });
  });

  it("keeps display staff fields without source avatar or crop geometry", () => {
    const user: User = {
      role: "staff",
      account: { ...account, id: "staff-1", name: "Emi", email: "emi@example.com" },
      staff: {
        avatar: "data:image/webp;base64,display",
        avatarOriginal: "data:image/jpeg;base64,original",
        avatarOffsetX: 12,
        avatarOffsetY: -4,
        avatarDisplayScale: 1.5,
        isActive: true,
      },
    };

    expect(toSessionUserDTO(user)).toEqual({
      role: "staff",
      account: {
        id: "staff-1",
        name: "Emi",
        phoneNumber: null,
        email: "emi@example.com",
        verifiedEmail: true,
      },
      staff: {
        avatar: "data:image/webp;base64,display",
        isActive: true,
      },
    });
  });
});
