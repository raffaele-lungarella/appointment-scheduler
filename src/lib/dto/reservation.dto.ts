import type { MinuteOfDay } from "$lib/domain/minute-of-day";
import type { DateValue, Time } from "@internationalized/date";

export type ReservationDTO = {
  id: string;
  date: string;
  startMinute: MinuteOfDay;
  name: string;
  email: string;
  phoneNumber: string | null;
  pending: boolean;
  expiresAt: Date;
  staff: {
    id: string;
    name: string;
  };
  offerings: {
    id: string;
    duration: number;
    name: string;
    price: number;
  }[];
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type CreatedReservationDTO = {
  id: string;
  pending: boolean;
  confirmationToken?: string;
  accessToken?: string;
};

export type ReservedSlotDTO = {
  date: DateValue;
  startMinute: MinuteOfDay;
  duration: Time;
};
