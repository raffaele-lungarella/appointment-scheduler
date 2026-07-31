import { Time } from "@internationalized/date";

declare const minuteOfDayBrand: unique symbol;

export type MinuteOfDay = number & { readonly [minuteOfDayBrand]: true };

export function createMinuteOfDay(value: number): MinuteOfDay {
  if (!Number.isInteger(value) || value < 0 || value >= 1440) {
    throw new RangeError("MinuteOfDay must be an integer between 0 and 1439");
  }
  return value as MinuteOfDay;
}

export function parseMinuteOfDay(value: string): MinuteOfDay | null {
  const match = /^(?:([01]\d|2[0-3]):([0-5]\d)(?::00)?|([0-9]{1,4}))$/.exec(value);
  if (!match) return null;

  const minute =
    match[3] === undefined ? Number(match[1]) * 60 + Number(match[2]) : Number(match[3]);
  try {
    return createMinuteOfDay(minute);
  } catch {
    return null;
  }
}

/** Creates a MinuteOfDay from a trusted time literal such as "10:00". */
export function minuteOfDay(value: string): MinuteOfDay {
  const parsed = parseMinuteOfDay(value);
  if (parsed === null) {
    throw new RangeError(`Invalid MinuteOfDay: ${value}`);
  }
  return parsed;
}

export function formatMinuteOfDay(value: MinuteOfDay): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function minuteOfDayToTime(value: MinuteOfDay): Time {
  return new Time(Math.floor(value / 60), value % 60);
}
