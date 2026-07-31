import type { SessionRow } from "$lib/server/db/schema";

export type Account = {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string;
  passwordHash: string;
  verifiedEmail: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Customer = {
  role: "customer";
  account: Account;
};

export type Staff = {
  role: "staff";
  account: Account;
  staff: {
    avatar: string | null;
    avatarOriginal: string | null;
    avatarOffsetX: number | null;
    avatarOffsetY: number | null;
    avatarDisplayScale: number | null;
    isActive: boolean;
  };
};

export type User = Customer | Staff;

export type UserSession = { user: User; session: SessionRow };
