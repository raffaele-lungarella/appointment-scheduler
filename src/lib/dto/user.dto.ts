export type AccountDTO = {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string;
  verifiedEmail: boolean;
};

export type CustomerDTO = {
  role: "customer";
  account: AccountDTO;
};

export type StaffDTO = {
  role: "staff";
  account: AccountDTO;
  staff: {
    avatar: string | null;
    isActive: boolean;
  };
};

export type StaffSummaryDTO = {
  id: string;
  name: string;
  avatar: string | null;
};

/** Browser-safe representation of an authenticated user. */
export type UserDTO = CustomerDTO | StaffDTO;

/** Minimal browser-safe reference to the authenticated session. */
export type SessionDTO = {
  id: string;
};
