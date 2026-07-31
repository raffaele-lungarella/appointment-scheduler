import type { CalendarDate } from "@internationalized/date";

const DEFAULT_SEARCH_DAYS = 365;

export function findFirstAvailableDate(
  start: CalendarDate,
  isAvailable: (date: CalendarDate) => boolean,
  searchDays = DEFAULT_SEARCH_DAYS,
): CalendarDate | undefined {
  for (let offset = 0; offset < searchDays; offset += 1) {
    const date = start.add({ days: offset });
    if (isAvailable(date)) return date;
  }

  return undefined;
}
