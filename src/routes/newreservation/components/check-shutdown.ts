import { parseDate, type DateValue } from "@internationalized/date";
import type { DBShutdown } from "@types";

/**
 * Checks if a date is unavailable due to staff shutdown periods.
 *
 * @param date - The date to check
 * @param shutdown - Array of all shutdown periods
 * @param staffID - The staff member ID to check shutdowns for
 * @returns true if the date falls within any shutdown period for the staff member
 */
export function checkShutdown(date: DateValue, shutdown: DBShutdown[], staffID: string): boolean {
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
