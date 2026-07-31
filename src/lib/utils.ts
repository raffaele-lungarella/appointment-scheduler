import { DateFormatter, getLocalTimeZone, parseDate, Time } from "@internationalized/date";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { err, ok } from "./modules/result";
import type { Result } from "./modules/result";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

export function formatTime(time: Time | string) {
  const [hours, minutes] = time.toString().split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export const formatDate = (
  date: string,
  dateStyle: "long" | "full" | "medium" | "short" | undefined = "long",
) => {
  const df = new DateFormatter("it-IT", {
    dateStyle,
  });

  const dateValue = parseDate(date);
  return df.format(dateValue.toDate(getLocalTimeZone()));
};

export const formatDateWithoutMonth = (date: string) => {
  const df = new DateFormatter("it-IT", {
    day: "numeric",
  });

  const dateValue = parseDate(date);
  return df.format(dateValue.toDate(getLocalTimeZone()));
};

export const formatDateWithoutYear = (date: string) => {
  const df = new DateFormatter("it-IT", {
    day: "numeric",
    month: "long",
  });

  const dateValue = parseDate(date);
  return df.format(dateValue.toDate(getLocalTimeZone()));
};

export const formatDateRange = (date1: string, date2: string) => {
  // Convert to calendar date for easy manipulating
  const dateValue1 = parseDate(date1);
  const dateValue2 = parseDate(date2);

  if (dateValue1.year === dateValue2.year) {
    if (dateValue1.month === dateValue2.month) {
      if (dateValue1.day === dateValue2.day) {
        // Same day
        return formatDate(dateValue1.toString());
      }
      // Different day
      return (
        formatDateWithoutMonth(dateValue1.toString()) + " - " + formatDate(dateValue2.toString())
      );
      // Different month
    }
    return formatDateWithoutYear(dateValue1.toString()) + " - " + formatDate(dateValue2.toString());
  }

  // Different year
  return (
    formatDate(dateValue1.toString(), "medium") +
    " - " +
    formatDate(dateValue2.toString(), "medium")
  );
};

export const formatCurrency = (amount: string) => {
  const formatter = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  });

  return formatter.format(Number.parseFloat(amount));
};

export function toDecimalHours(hours: number, minutes: number) {
  return hours + minutes / 60;
}

export function extractHoursAndMinutes(timeString: string) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours, minutes };
}

export function expired(timestamp: number): boolean {
  return timestamp < Date.now();
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return new Time(hours, minutes);
}

export function isEqualTime(t1: Time, t2: Time) {
  return t1.compare(t2) === 0;
}

export function getString(data: FormData, key: string): string {
  return data.get(key)?.toString() ?? "";
}

export function getNumber(data: FormData, key: string): number {
  const val = Number(data.get(key));
  return isNaN(val) ? 0 : val;
}

export function getBoolean(data: FormData, key: string): boolean {
  const value = data.get(key);
  return value === "on" || value === "true";
}

export function convertTimeFormat(time: Time) {
  // Split the time string by ':'
  const parts = time.toString().split(":");

  // Return only hours and minutes
  return `${parts[0]}:${parts[1]}`;
}

export function formatDurationParts(amount: number) {
  const time = convertTimeFormat(minutesToTime(amount));
  const [hours, minutes] = time.toString().split(":");

  return {
    hours: hours === "00" ? null : Number(hours),
    minutes: minutes === "00" ? null : Number(minutes),
  };
}

export function formatDuration(amount: number): string {
  const { hours, minutes } = formatDurationParts(amount);
  const parts: string[] = [];

  if (hours) {
    parts.push(`${hours} ${hours === 1 ? "ora" : "ore"}`);
  }

  if (minutes) {
    parts.push(`${minutes} min`);
  }

  return parts.join(" e ");
}

export function getInitials(name: string) {
  return name.toUpperCase().substring(0, 2);
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export function safeJsonParse(input: string): Result<unknown, "parse-error"> {
  try {
    return ok(JSON.parse(input));
  } catch {
    return err("parse-error");
  }
}
