import { describe, expect, it } from "vitest";
import { validateRange } from "./ranges";
import { Time } from "@internationalized/date";

describe("Ranges", () => {
	it("should validate correctly inserting ranges", () => {
		const schedules = [
			{
				start: new Time(9),
				end: new Time(13),
			},
			{
				start: new Time(14),
				end: new Time(18, 30),
			},
		];

		expect(validateRange({ start: new Time(9), end: new Time(14) }, schedules)).toBe(false);
		expect(validateRange({ start: new Time(9), end: new Time(13) }, schedules)).toBe(false);
		expect(validateRange({ start: new Time(7), end: new Time(8) }, schedules)).toBe(true);
		expect(validateRange({ start: new Time(18, 30), end: new Time(19) }, schedules)).toBe(
			false,
		);
		expect(validateRange({ start: new Time(18, 31), end: new Time(19) }, schedules)).toBe(true);
		expect(validateRange({ start: new Time(13, 1), end: new Time(13, 59) }, schedules)).toBe(
			true,
		);

		expect(validateRange({ start: new Time(8, 0), end: new Time(10) }, schedules)).toBe(false);
		expect(validateRange({ start: new Time(13, 1), end: new Time(15) }, schedules)).toBe(false);
	});
});
