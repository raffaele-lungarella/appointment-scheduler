import type { ReservationDTO } from "$lib/dto";

export type TimelineConfig = {
  startMinute: number;
  endMinute: number;
  minorStepMinutes: number;
  majorStepMinutes: number;
  pixelsPerMinute: number;
};

export type TimelineTick = {
  minute: number;
  top: number;
  label: string | null;
  major: boolean;
};

export type TimelineReservationLayout = {
  reservation: ReservationDTO;
  startMinute: number;
  endMinute: number;
  top: number;
  height: number;
  column: number;
  columnCount: number;
  clippedAtStart: boolean;
  clippedAtEnd: boolean;
};

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  startMinute: 9 * 60,
  endMinute: 19 * 60 + 30,
  minorStepMinutes: 15,
  majorStepMinutes: 60,
  pixelsPerMinute: 1,
};

export function formatMinute(minute: number): string {
  const clamped = Math.min(Math.max(Math.round(minute), 0), 24 * 60 - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function createTimelineScale(config: TimelineConfig) {
  validateConfig(config);

  const durationMinutes = config.endMinute - config.startMinute;
  const height = durationMinutes * config.pixelsPerMinute;

  return {
    durationMinutes,
    height,
    minuteToTop(minute: number) {
      return (minute - config.startMinute) * config.pixelsPerMinute;
    },
    topToMinute(top: number) {
      const clampedTop = Math.min(Math.max(top, 0), height);
      return config.startMinute + clampedTop / config.pixelsPerMinute;
    },
    durationToHeight(duration: number) {
      return duration * config.pixelsPerMinute;
    },
  };
}

export function createTimelineTicks(config: TimelineConfig): TimelineTick[] {
  const scale = createTimelineScale(config);
  const ticks: TimelineTick[] = [];

  for (
    let minute = config.startMinute;
    minute < config.endMinute;
    minute += config.minorStepMinutes
  ) {
    const major = minute === config.startMinute || minute % config.majorStepMinutes === 0;
    ticks.push({
      minute,
      top: scale.minuteToTop(minute),
      label: major ? formatMinute(minute) : null,
      major,
    });
  }

  ticks.push({
    minute: config.endMinute,
    top: scale.height,
    label: formatMinute(config.endMinute),
    major: true,
  });

  return ticks;
}

export function layoutReservations(
  reservations: ReservationDTO[],
  config: TimelineConfig,
): TimelineReservationLayout[] {
  const scale = createTimelineScale(config);
  const visible = reservations
    .map<TimelineReservationLayout | null>((reservation) => {
      const startMinute = reservation.startMinute;
      const duration = reservation.offerings.reduce(
        (total, offering) => total + offering.duration,
        0,
      );
      const endMinute = startMinute + duration;
      if (duration <= 0 || endMinute <= config.startMinute || startMinute >= config.endMinute) {
        return null;
      }

      const visibleStart = Math.max(startMinute, config.startMinute);
      const visibleEnd = Math.min(endMinute, config.endMinute);
      return {
        reservation,
        startMinute,
        endMinute,
        top: scale.minuteToTop(visibleStart),
        height: scale.durationToHeight(visibleEnd - visibleStart),
        column: 0,
        columnCount: 1,
        clippedAtStart: startMinute < config.startMinute,
        clippedAtEnd: endMinute > config.endMinute,
      } satisfies TimelineReservationLayout;
    })
    .filter((layout): layout is TimelineReservationLayout => layout !== null)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  let groupStart = 0;
  let groupEnd = -1;
  for (let index = 0; index <= visible.length; index += 1) {
    const item = visible[index];
    if (item && (index === groupStart || item.startMinute < groupEnd)) {
      groupEnd = Math.max(groupEnd, item.endMinute);
      continue;
    }

    assignColumns(visible.slice(groupStart, index));
    groupStart = index;
    groupEnd = item?.endMinute ?? -1;
  }

  return visible;
}

function assignColumns(group: TimelineReservationLayout[]) {
  const columnEnds: number[] = [];

  for (const item of group) {
    let column = columnEnds.findIndex((end) => end <= item.startMinute);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = item.endMinute;
    item.column = column;
  }

  for (const item of group) item.columnCount = columnEnds.length;
}

function validateConfig(config: TimelineConfig) {
  if (
    config.startMinute < 0 ||
    config.endMinute > 24 * 60 ||
    config.endMinute <= config.startMinute
  ) {
    throw new Error("Timeline must have a valid, positive range within one day");
  }
  if (config.minorStepMinutes <= 0 || config.majorStepMinutes <= 0 || config.pixelsPerMinute <= 0) {
    throw new Error("Timeline steps and scale must be positive");
  }
}
