import type { ShutdownDTO } from "$lib/dto";
import { parseDate, type DateValue } from "@internationalized/date";

export function checkShutdown(date: DateValue, shutdown: ShutdownDTO[], staffID: string): boolean {
  const staffShutdown = shutdown.filter((el) => el.staffID === staffID);

  for (const s of staffShutdown) {
    const start = parseDate(s.start);
    const end = parseDate(s.end);

    if (date.compare(start) >= 0 && date.compare(end) <= 0) {
      return true;
    }
  }

  return false;
}
