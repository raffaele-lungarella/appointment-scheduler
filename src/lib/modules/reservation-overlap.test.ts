import { parseTime, Time } from "@internationalized/date";
import { describe, expect, it } from "vitest";
import { hasReservationConflict } from "./reservation-overlap";

describe("reservation overlap", () => {
	const existing = [
		{
			start: parseTime("10:00:00"),
			duration: new Time(0, 45),
		},
	];

	it("detects an overlapping start time", () => {
		expect(
			hasReservationConflict(
				{
					start: parseTime("10:15:00"),
					duration: new Time(0, 30),
				},
				existing,
			),
		).toBe(true);
	});

	it("detects an overlapping end time", () => {
		expect(
			hasReservationConflict(
				{
					start: parseTime("09:45:00"),
					duration: new Time(0, 30),
				},
				existing,
			),
		).toBe(true);
	});

	it("allows adjacent reservations", () => {
		expect(
			hasReservationConflict(
				{
					start: parseTime("10:45:00"),
					duration: new Time(0, 30),
				},
				existing,
			),
		).toBe(false);
	});
});
