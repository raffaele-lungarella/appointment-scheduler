import { minuteOfDay } from "$lib/domain/minute-of-day";
import { Day } from "$lib/enums/days";
import type { ScheduleRange } from "$lib/shared";
import { Time } from "@internationalized/date";

import type { Slot } from "./get-slots";

// The following days have plain 15 minutes slots
export const monday: Slot[] = [
  { startMinute: minuteOfDay("14:00"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("14:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:30"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("15:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("16:00"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("16:15"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("16:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("16:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:45"), available: true, invalid: false, past: false },
];

export const normalDay: Slot[] = [
  { startMinute: minuteOfDay("09:00"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("09:15"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("09:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("09:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:30"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("11:45"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("12:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("15:30"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("15:45"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("16:00"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("16:15"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("16:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("16:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("17:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("18:15"), available: true, invalid: false, past: false },
];

export const saturday: Slot[] = [
  { startMinute: minuteOfDay("10:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("10:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("11:30"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("11:45"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("12:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("12:45"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("13:00"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("13:15"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("13:30"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("13:45"), available: false, invalid: false, past: false },
  { startMinute: minuteOfDay("14:00"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:15"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:30"), available: true, invalid: false, past: false },
  { startMinute: minuteOfDay("14:45"), available: true, invalid: false, past: false },
];

export const schedule = new Map<Day, ScheduleRange[]>([
  [
    Day.MONDAY,
    [
      {
        start: new Time(14),
        end: new Time(19),
      },
    ],
  ],
  [
    Day.TUESDAY,
    [
      {
        start: new Time(9),
        end: new Time(13),
      },
      {
        start: new Time(14),
        end: new Time(18, 30),
      },
    ],
  ],
  [
    Day.WEDNESDAY,
    [
      {
        start: new Time(9),
        end: new Time(13),
      },
      {
        start: new Time(14),
        end: new Time(18, 30),
      },
    ],
  ],
  [
    Day.THURSDAY,
    [
      {
        start: new Time(9),
        end: new Time(13),
      },

      {
        start: new Time(14),
        end: new Time(18, 30),
      },
    ],
  ],
  [
    Day.FRIDAY,
    [
      {
        start: new Time(9),
        end: new Time(13),
      },

      {
        start: new Time(14),
        end: new Time(18, 30),
      },
    ],
  ],
  [
    Day.SATURDAY,
    [
      {
        start: new Time(10),
        end: new Time(15),
      },
    ],
  ],
]);
