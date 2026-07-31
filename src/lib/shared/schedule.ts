import type { Day } from "$lib/enums/days";
import type { Time } from "@internationalized/date";

export type ScheduleEntry = {
  id: number;
  staffID: string;
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type ScheduleRange = {
  start: Time;
  end: Time;
  id?: number;
};

export type ScheduleUI = Map<Day, ScheduleRange[]>;
