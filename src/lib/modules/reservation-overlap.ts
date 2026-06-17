import type { ReservedSlot } from "@types";
import { Time } from "@internationalized/date";

export type ReservationInterval = Pick<ReservedSlot, "start" | "duration">;

export function isSlotAvailable(
  slotStart: Time,
  reservations: ReservationInterval[],
): boolean {
  return !hasReservationConflict(
    {
      start: slotStart,
      duration: new Time(0, 15),
    },
    reservations,
  );
}

export function hasReservationConflict(
  requested: ReservationInterval,
  reservations: ReservationInterval[],
): boolean {
  return reservations.some((curr) =>
    reservationIntervalsOverlap(requested, curr),
  );
}

export function reservationIntervalsOverlap(
  first: ReservationInterval,
  second: ReservationInterval,
): boolean {
  return timeRangesOverlap(
    first.start,
    addTime(first.start, first.duration),
    second.start,
    addTime(second.start, second.duration),
  );
}

function timeRangesOverlap(
  firstStart: Time,
  firstEnd: Time,
  secondStart: Time,
  secondEnd: Time,
) {
  return firstStart.compare(secondEnd) < 0 && secondStart.compare(firstEnd) < 0;
}

function addTime(start: Time, duration: Pick<Time, "hour" | "minute">) {
  return start.add({ hours: duration.hour, minutes: duration.minute });
}
