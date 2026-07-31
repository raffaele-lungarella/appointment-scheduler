import { createMinuteOfDay, type MinuteOfDay } from "$lib/domain/minute-of-day";
import type { ReservedSlotDTO } from "$lib/dto";
import type { ScheduleUI } from "$lib/shared";
import {
  type CalendarDate,
  getDayOfWeek,
  getLocalTimeZone,
  isToday,
  now,
  Time,
  type DateValue,
} from "@internationalized/date";

export type Slot = {
  startMinute: MinuteOfDay;
  available: boolean;
  invalid: boolean;
  past: boolean;
};

export const SlotDuration = new Time(0, 15);

export const getSlots = (
  date: CalendarDate,
  reservations: ReservedSlotDTO[],
  schedule: ScheduleUI,
  offering?: Time,
) => {
  let slots = generateSlots(date, schedule);

  // reserved slots
  slots = reserved(slots, reservations);

  // slots in the past
  if (isToday(date, getLocalTimeZone())) {
    const n = now(getLocalTimeZone());
    const currentMinute = createMinuteOfDay(n.hour * 60 + n.minute);
    slots = slots.map((slot) => ({ ...slot, past: slot.startMinute < currentMinute }));
  }

  // slots with not enough time
  if (offering) {
    slots = invalid(slots, offering);
  }

  return sortSlots(slots);
};

function invalid(slots: Slot[], duration: Time) {
  const nSlots = slotCount(duration, SlotDuration);
  if (nSlots === 1) {
    return slots;
  }

  return slots.map((s, index) => {
    if (!s.available) {
      return s;
    }
    const nextSlots = structuredClone(slots).splice(index, nSlots);

    if (nextSlots.length !== nSlots) {
      return { ...s, invalid: true };
    }

    if (!slotsWithoutGaps(nextSlots)) {
      return { ...s, invalid: true };
    }

    if (nextSlots.some((el) => !el.available)) {
      return { ...s, invalid: true };
    } else {
      return s;
    }
  });
}

function slotsWithoutGaps(slots: Slot[]) {
  for (const [i, current] of slots.entries()) {
    const next = slots[i + 1];
    if (!next) {
      continue;
    }
    const diffMinutes = next.startMinute - current.startMinute;

    if (diffMinutes > SlotDuration.hour * 60 + SlotDuration.minute) {
      return false;
    }
  }
  return true;
}

function isAvailable(slot: Slot, reservations: ReservedSlotDTO[]): boolean {
  for (const r of reservations) {
    const durationMinutes = r.duration.hour * 60 + r.duration.minute;
    const endMinute = r.startMinute + durationMinutes;

    if (slot.startMinute >= r.startMinute && slot.startMinute < endMinute) {
      return false;
    }
  }

  return true;
}

function reserved(slots: Slot[], reservations: ReservedSlotDTO[]): Slot[] {
  return slots.map((s) => ({ ...s, available: isAvailable(s, reservations) }));
}

function slotCount(duration: Time, slotDuration: Time): number {
  const totalMinutes = duration.hour * 60 + duration.minute;
  const slotMinutes = slotDuration.hour * 60 + slotDuration.minute;
  return Math.ceil(totalMinutes / slotMinutes);
}

function generateSlots(date: DateValue, schedule: ScheduleUI) {
  const dayOfTheWeek = getDayOfWeek(date, "it-IT");
  const businessIntervals = schedule.get(dayOfTheWeek);
  if (!businessIntervals) {
    return [];
  }
  return businessIntervals.flatMap((interval) =>
    generateSlotsFromInterval(interval.start, interval.end),
  );
}

export function generateSlotsFromInterval(start: Time, end: Time): Slot[] {
  const slots: Slot[] = [];
  let current = start;

  while (current.compare(end) < 0) {
    slots.push({
      startMinute: createMinuteOfDay(current.hour * 60 + current.minute),
      available: true,
      invalid: false,
      past: false,
    });
    current = current.add({ hours: SlotDuration.hour, minutes: SlotDuration.minute });
  }

  return slots;
}

function sortSlots(slots: Slot[]): Slot[] {
  return slots.sort((a, b) => {
    return a.startMinute - b.startMinute;
  });
}
