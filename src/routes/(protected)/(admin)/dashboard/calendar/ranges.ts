import { Day } from "$lib/enums/days";
import type { ScheduleEntry, ScheduleRange, ScheduleUI } from "$lib/shared";
import { Time } from "@internationalized/date";
import { SvelteMap } from "svelte/reactivity";

export function mapToUI(schedule: ScheduleEntry[], staffID: string): ScheduleUI {
  // Group schedules by day
  const grouped = Object.groupBy(
    schedule.filter((el) => el.staffID === staffID),
    ({ day }) => day,
  );

  // Create a Map with all days initialized
  const scheduleMap = new SvelteMap<Day, ScheduleRange[]>();

  // Convert grouped object to Map
  Object.entries(grouped).forEach(([day, schedules]) => {
    const dayNum = Number(day) as Day;
    const ranges = (schedules || []).map((s) => ({
      start: new Time(s.startHour, s.startMinute),
      end: new Time(s.endHour, s.endMinute),
      id: s.id,
    }));
    scheduleMap.set(dayNum, ranges);
  });

  return scheduleMap;
}
export function initializeEmptyMap(): SvelteMap<Day, ScheduleRange[]> {
  const m = new SvelteMap<Day, ScheduleRange[]>();
  for (let i = Number(Day.MONDAY); i <= Number(Day.SUNDAY); i++) {
    m.set(i as Day, []);
  }
  return m;
}

export function mapToDB(scheduleMap: Map<Day, ScheduleRange[]>) {
  const arr = Array.from(scheduleMap.entries()).map(([day, ranges]) => ({
    day,
    schedules: ranges.map(({ start, end, id }) => ({
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      id,
    })),
  }));

  const dbarr: {
    day: Day;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }[] = [];
  arr.forEach((el) => {
    el.schedules.forEach((schedule) => {
      dbarr.push({
        day: el.day,
        startHour: schedule.startHour,
        startMinute: schedule.startMinute,
        endHour: schedule.endHour,
        endMinute: schedule.endMinute,
      });
    });
  });

  return dbarr;
}

export function validateRange(rangeToAdd: ScheduleRange, ranges: ScheduleRange[]) {
  /* We can assume start is always less than the end in every range */
  return ranges.every((r) => {
    /*
     * If the range to add starts higher than the range start we
     * are cycling, it MUST be greater than the range end too
     */
    if (rangeToAdd.start.compare(r.start) > 0) {
      if (rangeToAdd.start.compare(r.end) > 0) {
        return true;
      }
      return false;
    } else if (rangeToAdd.start.compare(r.start) < 0) {
      /*
       * If the range to add starts lower than the range start we
       * are cycling, the add end MUST be lower too
       */
      if (rangeToAdd.end.compare(r.start) < 0) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  });
}
