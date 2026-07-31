import { minuteOfDay } from "$lib/domain/minute-of-day";
import type { ReservedSlotDTO } from "$lib/dto";
import { CalendarDate, parseDate, Time } from "@internationalized/date";
import { expect } from "@playwright/test";
import { describe, it } from "vitest";

import type { Slot } from "./get-slots";
import { getSlots } from "./get-slots";
import { monday, normalDay, saturday, schedule } from "./get-slots.stub";

describe("Get slots", () => {
  describe("should disable occupied slots", () => {
    it("monday", () => {
      const date = new CalendarDate(2022, 1, 3);
      const currentReservations: ReservedSlotDTO[] = [
        {
          date: parseDate("2022-01-03"),
          startMinute: minuteOfDay("14:00"),
          duration: new Time(0, 15),
        },
        {
          date: parseDate("2022-01-03"),
          startMinute: minuteOfDay("15:30"),
          duration: new Time(0, 15),
        },
        {
          date: parseDate("2022-01-03"),
          startMinute: minuteOfDay("16:00"),
          duration: new Time(0, 30),
        },
      ];

      const slots = getSlots(date, currentReservations, schedule);
      expect(slots?.every((el, index) => equalSlot(el, monday[index], index))).toBe(true);
    });

    it("normal day", () => {
      const date = new CalendarDate(2022, 1, 4);
      const currentReservations: ReservedSlotDTO[] = [
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("09:00"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("11:30"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("15:30"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("16:00"),
          duration: new Time(0, 30),
        },
      ];

      const slots = getSlots(date, currentReservations, schedule);
      expect(slots?.every((el, index) => equalSlot(el, normalDay[index], index))).toBe(true);
    });
    it("saturday", () => {
      const date = new CalendarDate(2022, 1, 8);
      const currentReservations: ReservedSlotDTO[] = [
        {
          date: parseDate("2022-07-03"),
          startMinute: minuteOfDay("11:30"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-07-03"),
          startMinute: minuteOfDay("13:00"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-07-03"),
          startMinute: minuteOfDay("13:30"),
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
        getSlots(monday, [], schedule)?.find((el) => el.startMinute === minuteOfDay("13:00")),
      ).toBe(undefined);
    });
    it("normal day", () => {
      const monday = new CalendarDate(2022, 2, 3);
      expect(
        getSlots(monday, [], schedule)?.find((el) => el.startMinute === minuteOfDay("13:00")),
      ).toBe(undefined);
    });
    it("saturday", () => {
      const monday = new CalendarDate(2022, 1, 3);
      expect(
        getSlots(monday, [], schedule)?.find((el) => el.startMinute === minuteOfDay("13:00")),
      ).toBe(undefined);
    });
  });

  it("should work for long duration offerings", () => {
    const date = new CalendarDate(2022, 2, 3);
    const currentReservations: ReservedSlotDTO[] = [
      {
        date: parseDate("2022-02-03"),
        startMinute: minuteOfDay("09:00"),
        duration: new Time(0, 45),
      },
      {
        date: parseDate("2022-02-03"),
        startMinute: minuteOfDay("14:00"),
        duration: new Time(2, 0),
      },
      {
        date: parseDate("2022-02-03"),
        startMinute: minuteOfDay("17:00"),
        duration: new Time(1, 30),
      },
    ];

    const correctSlots: Slot[] = [
      { startMinute: minuteOfDay("09:00"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("09:15"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("09:30"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("09:45"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("10:00"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("10:15"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("10:30"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("10:45"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("11:00"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("11:15"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("11:30"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("11:45"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("12:00"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("12:15"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("12:30"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("12:45"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("14:00"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("14:15"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("14:30"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("14:45"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("15:00"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("15:15"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("15:30"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("15:45"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("16:00"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("16:15"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("16:30"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("16:45"), available: true, invalid: false, past: false },
      { startMinute: minuteOfDay("17:00"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("17:15"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("17:30"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("17:45"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("18:00"), available: false, invalid: false, past: false },
      { startMinute: minuteOfDay("18:15"), available: false, invalid: false, past: false },
    ];

    const slots = getSlots(date, currentReservations, schedule);
    expect(slots?.length).toEqual(correctSlots.length);
    expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(true);
  });

  describe("should handle invalid slots correctly", () => {
    it("first scenario", () => {
      const date = new CalendarDate(2022, 2, 3);
      const currentReservations: ReservedSlotDTO[] = [
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("09:00"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("10:00"),
          duration: new Time(0, 30),
        },
        {
          date: parseDate("2022-02-03"),
          startMinute: minuteOfDay("15:00"),
          duration: new Time(2, 0),
        },
      ];

      const correctSlots: Slot[] = [
        { startMinute: minuteOfDay("09:00"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("09:15"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("09:30"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("09:45"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("10:00"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("10:15"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("10:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("10:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:30"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("12:45"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("14:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("14:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("14:30"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("14:45"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("15:00"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("15:15"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("15:30"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("15:45"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("16:00"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("16:15"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("16:30"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("16:45"), available: false, invalid: false, past: false },
        { startMinute: minuteOfDay("17:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("18:00"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("18:15"), available: true, invalid: true, past: false },
      ];

      const slots = getSlots(date, currentReservations, schedule, new Time(0, 45));

      expect(slots?.length).toEqual(correctSlots.length);
      expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(true);
    });

    it("second scenario", () => {
      const date = new CalendarDate(2022, 2, 3);

      const correctSlots: Slot[] = [
        { startMinute: minuteOfDay("09:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("09:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("09:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("09:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("10:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("10:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("10:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("10:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("11:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("12:30"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("12:45"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("14:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("14:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("14:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("14:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("15:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("15:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("15:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("15:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("16:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("16:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("16:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("16:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:00"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:15"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:30"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("17:45"), available: true, invalid: false, past: false },
        { startMinute: minuteOfDay("18:00"), available: true, invalid: true, past: false },
        { startMinute: minuteOfDay("18:15"), available: true, invalid: true, past: false },
      ];

      const slots = getSlots(date, [], schedule, new Time(0, 45));

      expect(slots?.length).toEqual(correctSlots.length);
      expect(slots?.every((el, index) => equalSlot(el, correctSlots[index], index))).toBe(true);
    });
  });
});

function equalSlot(item1: Slot, item2: Slot, index: number): boolean {
  if (item1.startMinute === item2.startMinute) {
    if (item1.available === item2.available) {
      if (item1.invalid === item2.invalid) {
        return true;
      }
    }
  }
  console.error(`The element at position ${index} is not equal!`);
  return false;
}
