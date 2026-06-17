import * as u from "$lib/utils";
import { describe, it, expect } from "vitest";

describe("Extract hours and minutes function", () => {
	it("should correctly extract from 8:30", () => {
		const timeString = "8:30";
		const { hours, minutes } = u.extractHoursAndMinutes(timeString);
		expect(hours).toEqual(8);
		expect(minutes).toEqual(30);
	});
	it("should extract from 8:30:00", () => {
		const timeString = "8:30";
		const { hours, minutes } = u.extractHoursAndMinutes(timeString);
		expect(hours).toEqual(8);
		expect(minutes).toEqual(30);
	});
});

describe("Format date function", () => {
	it("should format an ISO date", () => {
		const date = "2025-02-16";
		const formattedDate = u.formatDate(date);
		expect(formattedDate).toEqual("16 febbraio 2025");
	});
});

describe("Format date range function", () => {
	it("should format dates with same month", () => {
		const firstDate = "2025-02-16";
		const secondDate = "2025-02-21";
		const formattedDate = u.formatDateRange(firstDate, secondDate);
		expect(formattedDate).toEqual("16 - 21 febbraio 2025");
	});
	it("should format dates with same year", () => {
		const firstDate = "2025-02-16";
		const secondDate = "2025-03-21";
		const formattedDate = u.formatDateRange(firstDate, secondDate);
		expect(formattedDate).toEqual("16 febbraio - 21 marzo 2025");
	});
	it("should format different dates", () => {
		const firstDate = "2025-02-16";
		const secondDate = "2026-03-21";
		const formattedDate = u.formatDateRange(firstDate, secondDate);
		expect(formattedDate).toEqual("16 feb 2025 - 21 mar 2026");
	});
	it("should format same date into one date", () => {
		const firstDate = "2025-02-16";
		const secondDate = "2025-02-16";
		const formattedDate = u.formatDateRange(firstDate, secondDate);
		expect(formattedDate).toEqual("16 febbraio 2025");
	});
});

describe("To decimal hours", () => {
	const times = [
		[8, 45, 8.75],
		[12, 15, 12.25],
		[12, 0, 12],
		[0, 0, 0],
		[9, 60, 10],
	];
	it.each(times)("time with hour: %i and minutes %i should be: %f", (hour, minute, expected) => {
		const dec = u.toDecimalHours(hour, minute);
		expect(dec).toEqual(expected);
	});
});
