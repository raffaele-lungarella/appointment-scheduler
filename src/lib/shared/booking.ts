import type { MinuteOfDay } from "$lib/domain/minute-of-day";

export type Data = AnonymousData | UsualData | StaffData;

export type AnonymousData = {
  who: "anonymous";
  name: string;
  email: string;
  date: string;
  startMinute: MinuteOfDay;
  offerings: string[];
  staff: string;
  phone?: string;
};

export type UsualData = {
  who: "usual";
  date: string;
  startMinute: MinuteOfDay;
  offerings: string[];
  staff: string;
};

export type StaffData = {
  who: "staff";
  name: string;
  phone?: string;
  date: string;
  startMinute: MinuteOfDay;
  offerings: string[];
  staff: string;
};

export type Tab = "date" | "offering" | "info";
