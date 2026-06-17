import type { ReservedSlot, Slot } from "@types";
import { CalendarDate, parseDate, parseTime, Time } from "@internationalized/date";
import { expect } from "@playwright/test";
import { describe, it } from "vitest";
import { getSlots } from "./get-slots";
import { monday, normalDay, saturday, schedule } from "./get-slots.stub";
import { isEqualTime } from "$lib/utils";
import { Day } from "$lib/enums/days";

describe("Get slots", () => {
	describe("should disable occupied slots", () => {
		it("monday", () => {
			const date = new CalendarDate(2022, 1, 3);
			const currentReservations: ReservedSlot[] = [
				{
					date: parseDate("2022-01-03"),
					start: parseTime("14:00:00"),
					duration: new Time(0, 15),
				},
				{
					date: parseDate("2022-01-03"),
					start: parseTime("15:30:00"),
					duration: new Time(0, 15),
				},
				{
					date: parseDate("2022-01-03"),
					start: parseTime("16:00:00"),
					duration: new Time(0, 30),
				},
			];

			const slots = getSlots(date, currentReservations, schedule);
			expect(slots?.every((el, index) => equalSlot(el, monday[index], index))).toBe(true);
		});

		it("normal day", () => {
			const date = new CalendarDate(2022, 1, 4);
			const currentReservations: ReservedSlot[] = [
				{
					date: parseDate("2022-02-03"),
					start: parseTime("09:00:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-02-03"),
					start: parseTime("11:30:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-02-03"),
					start: parseTime("15:30:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-02-03"),
					start: parseTime("16:00:00"),
					duration: new Time(0, 30),
				},
			];

			const slots = getSlots(date, currentReservations, schedule);
			expect(slots?.every((el, index) => equalSlot(el, normalDay[index], index))).toBe(true);
		});
		it("saturday", () => {
			const date = new CalendarDate(2022, 1, 8);
			const currentReservations: ReservedSlot[] = [
				{
					date: parseDate("2022-07-03"),
					start: parseTime("11:30:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-07-03"),
					start: parseTime("13:00:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-07-03"),
					start: parseTime("13:30:00"),
					duration: new Time(0, 30),
				},
			];

			const slots = getSlots(date, currentReservations, schedule);
			expect(slots?.every((el, index) => equalSlot(el, saturday[index], index))).toBe(true);
		});
	});

	describe("should contain the correct number of slots", () => {
		it("monday", () => {
			const date = new CalendarDate(2022, 1, 3);

			expect(getSlots(date, [], schedule)?.length).toEqual(monday.length);
		});
		it("normal day", () => {
			const date = new CalendarDate(2022, 1, 4);

			expect(getSlots(date, [], schedule)?.length).toEqual(normalDay.length);
		});
		it("saturday", () => {
			const date = new CalendarDate(2022, 1, 8);
			expect(getSlots(date, [], schedule)?.length).toEqual(saturday.length);
		});
	});

	describe("should not have the end of an interval as a slot", () => {
		it("monday", () => {
			const monday = new CalendarDate(2022, 1, 3);
			expect(
				getSlots(monday, [], schedule)?.find(
					(el) => el.start === schedule.get(Day.MONDAY)?.[0].end,
				),
			).toBe(undefined);
		});
		it("normal day", () => {
			const monday = new CalendarDate(2022, 2, 3);
			expect(
				getSlots(monday, [], schedule)?.find(
					(el) => el.start === schedule.get(Day.THURSDAY)?.[0].end,
				),
			).toBe(undefined);
		});
		it("saturday", () => {
			const monday = new CalendarDate(2022, 1, 3);
			expect(
				getSlots(monday, [], schedule)?.find(
					(el) => el.start === schedule.get(Day.SATURDAY)?.[0].end,
				),
			).toBe(undefined);
		});
	});

	it("should work for long duration kinds", () => {
		const date = new CalendarDate(2022, 2, 3);
		const currentReservations: ReservedSlot[] = [
			{
				date: parseDate("2022-02-03"),
				start: parseTime("09:00:00"),
				duration: new Time(0, 45),
			},
			{
				date: parseDate("2022-02-03"),
				start: parseTime("14:00:00"),
				duration: new Time(2, 0),
			},
			{
				date: parseDate("2022-02-03"),
				start: parseTime("17:00:00"),
				duration: new Time(1, 30),
			},
		];

		const correctSlots: Slot[] = [
			{ start: parseTime("09:00:00"), available: false, invalid: false, past: false },
			{ start: parseTime("09:15:00"), available: false, invalid: false, past: false },
			{ start: parseTime("09:30:00"), available: false, invalid: false, past: false },
			{ start: parseTime("09:45:00"), available: true, invalid: false, past: false },
			{ start: parseTime("10:00:00"), available: true, invalid: false, past: false },
			{ start: parseTime("10:15:00"), available: true, invalid: false, past: false },
			{ start: parseTime("10:30:00"), available: true, invalid: false, past: false },
			{ start: parseTime("10:45:00"), available: true, invalid: false, past: false },
			{ start: parseTime("11:00:00"), available: true, invalid: false, past: false },
			{ start: parseTime("11:15:00"), available: true, invalid: false, past: false },
			{ start: parseTime("11:30:00"), available: true, invalid: false, past: false },
			{ start: parseTime("11:45:00"), available: true, invalid: false, past: false },
			{ start: parseTime("12:00:00"), available: true, invalid: false, past: false },
			{ start: parseTime("12:15:00"), available: true, invalid: false, past: false },
			{ start: parseTime("12:30:00"), available: true, invalid: false, past: false },
			{ start: parseTime("12:45:00"), available: true, invalid: false, past: false },
			{ start: parseTime("14:00:00"), available: false, invalid: false, past: false },
			{ start: parseTime("14:15:00"), available: false, invalid: false, past: false },
			{ start: parseTime("14:30:00"), available: false, invalid: false, past: false },
			{ start: parseTime("14:45:00"), available: false, invalid: false, past: false },
			{ start: parseTime("15:00:00"), available: false, invalid: false, past: false },
			{ start: parseTime("15:15:00"), available: false, invalid: false, past: false },
			{ start: parseTime("15:30:00"), available: false, invalid: false, past: false },
			{ start: parseTime("15:45:00"), available: false, invalid: false, past: false },
			{ start: parseTime("16:00:00"), available: true, invalid: false, past: false },
			{ start: parseTime("16:15:00"), available: true, invalid: false, past: false },
			{ start: parseTime("16:30:00"), available: true, invalid: false, past: false },
			{ start: parseTime("16:45:00"), available: true, invalid: false, past: false },
			{ start: parseTime("17:00:00"), available: false, invalid: false, past: false },
			{ start: parseTime("17:15:00"), available: false, invalid: false, past: false },
			{ start: parseTime("17:30:00"), available: false, invalid: false, past: false },
			{ start: parseTime("17:45:00"), available: false, invalid: false, past: false },
			{ start: parseTime("18:00:00"), available: false, invalid: false, past: false },
			{ start: parseTime("18:15:00"), available: false, invalid: false, past: false },
		];

		const slots = getSlots(date, currentReservations, schedule);
		expect(slots?.length).toEqual(correctSlots.length);
		expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(true);
	});

	describe("should handle invalid slots correctly", () => {
		it("first scenario", () => {
			const date = new CalendarDate(2022, 2, 3);
			const currentReservations: ReservedSlot[] = [
				{
					date: parseDate("2022-02-03"),
					start: parseTime("09:00:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-02-03"),
					start: parseTime("10:00:00"),
					duration: new Time(0, 30),
				},
				{
					date: parseDate("2022-02-03"),
					start: parseTime("15:00:00"),
					duration: new Time(2, 0),
				},
			];

			const correctSlots: Slot[] = [
				{ start: parseTime("09:00:00"), available: false, invalid: false, past: false },
				{ start: parseTime("09:15:00"), available: false, invalid: false, past: false },
				{ start: parseTime("09:30:00"), available: true, invalid: true, past: false },
				{ start: parseTime("09:45:00"), available: true, invalid: true, past: false },
				{ start: parseTime("10:00:00"), available: false, invalid: false, past: false },
				{ start: parseTime("10:15:00"), available: false, invalid: false, past: false },
				{ start: parseTime("10:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("10:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:30:00"), available: true, invalid: true, past: false },
				{ start: parseTime("12:45:00"), available: true, invalid: true, past: false },
				{ start: parseTime("14:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("14:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("14:30:00"), available: true, invalid: true, past: false },
				{ start: parseTime("14:45:00"), available: true, invalid: true, past: false },
				{ start: parseTime("15:00:00"), available: false, invalid: false, past: false },
				{ start: parseTime("15:15:00"), available: false, invalid: false, past: false },
				{ start: parseTime("15:30:00"), available: false, invalid: false, past: false },
				{ start: parseTime("15:45:00"), available: false, invalid: false, past: false },
				{ start: parseTime("16:00:00"), available: false, invalid: false, past: false },
				{ start: parseTime("16:15:00"), available: false, invalid: false, past: false },
				{ start: parseTime("16:30:00"), available: false, invalid: false, past: false },
				{ start: parseTime("16:45:00"), available: false, invalid: false, past: false },
				{ start: parseTime("17:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("18:00:00"), available: true, invalid: true, past: false },
				{ start: parseTime("18:15:00"), available: true, invalid: true, past: false },
			];

			const slots = getSlots(date, currentReservations, schedule, new Time(0, 45));

			expect(slots?.length).toEqual(correctSlots.length);
			expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(
				true,
			);
		});

		it("second scenario", () => {
			const date = new CalendarDate(2022, 2, 3);

			const correctSlots: Slot[] = [
				{ start: parseTime("09:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("09:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("09:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("09:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("10:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("10:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("10:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("10:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("11:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("12:30:00"), available: true, invalid: true, past: false },
				{ start: parseTime("12:45:00"), available: true, invalid: true, past: false },
				{ start: parseTime("14:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("14:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("14:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("14:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("15:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("15:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("15:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("15:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("16:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("16:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("16:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("16:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:00:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:15:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:30:00"), available: true, invalid: false, past: false },
				{ start: parseTime("17:45:00"), available: true, invalid: false, past: false },
				{ start: parseTime("18:00:00"), available: true, invalid: true, past: false },
				{ start: parseTime("18:15:00"), available: true, invalid: true, past: false },
			];

			const slots = getSlots(date, [], schedule, new Time(0, 45));

			expect(slots?.length).toEqual(correctSlots.length);
			expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(
				true,
			);
		});
	});
});

function equalSlot(item1: Slot, item2: Slot, index: number): boolean {
	if (isEqualTime(item1.start, item2.start)) {
		if (item1.available === item2.available) {
			if (item1.invalid === item2.invalid) {
				return true;
			}
		}
	}
	console.error(`The element at position ${index} is not equal!`);
	return false;
}
