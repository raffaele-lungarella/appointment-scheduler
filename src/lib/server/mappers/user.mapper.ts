import type { AccountDTO, StaffDTO, UserDTO } from "$lib/dto";
import type { StaffRow, UserRow } from "$lib/server/db/schema";
import type { Account, Staff, User } from "$lib/server/domain";

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber,
    email: row.email,
    passwordHash: row.passwordHash,
    verifiedEmail: row.verifiedEmail,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toStaffProfile(row: StaffRow): Staff["staff"] {
  return {
    avatar: row.avatar,
    avatarOriginal: row.avatarOriginal,
    avatarOffsetX: row.avatarOffsetX,
    avatarOffsetY: row.avatarOffsetY,
    avatarDisplayScale: row.avatarDisplayScale,
    isActive: row.isActive,
  };
}

export function toUserDomain(accountRow: UserRow, staffRow: StaffRow | null): User {
  const account = toAccount(accountRow);
  if (!staffRow) return { role: "customer", account };

  return {
    role: "staff",
    account,
    staff: toStaffProfile(staffRow),
  };
}

function toSessionAccountDTO(user: User): AccountDTO {
  return {
    id: user.account.id,
    name: user.account.name,
    phoneNumber: user.account.phoneNumber,
    email: user.account.email,
    verifiedEmail: user.account.verifiedEmail,
  };
}

/** Maps a complete server-side user to the explicit subset safe to serialize to clients. */
export function toSessionUserDTO(user: Staff): StaffDTO;
export function toSessionUserDTO(user: User): UserDTO;
export function toSessionUserDTO(user: User): UserDTO {
  const account = toSessionAccountDTO(user);

  if (user.role === "staff") {
    return {
      role: "staff",
      account,
      staff: {
        avatar: user.staff.avatar,
        isActive: user.staff.isActive,
      },
    };
  }

  return { role: "customer", account };
}
