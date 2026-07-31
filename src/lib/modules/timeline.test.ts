import { parseMinuteOfDay } from "$lib/domain/minute-of-day";
import type { ReservationDTO } from "$lib/dto";
import { describe, expect, it } from "vitest";

import {
  createTimelineScale,
  createTimelineTicks,
  DEFAULT_TIMELINE_CONFIG,
  formatMinute,
  layoutReservations,
  type TimelineConfig,
} from "./timeline";

const config: TimelineConfig = {
  ...DEFAULT_TIMELINE_CONFIG,
  startMinute: 9 * 60 + 30,
  endMinute: 12 * 60,
  pixelsPerMinute: 2,
};

function reservation(id: string, hour: string, duration: number): ReservationDTO {
  return {
    id,
    date: "2026-07-21",
    startMinute:
      parseMinuteOfDay(hour) ??
      (() => {
        throw new Error("Invalid fixture time");
      })(),
    name: id,
    email: `${id}@example.com`,
    phoneNumber: null,
    pending: false,
    expiresAt: new Date(),
    staff: { id: "staff", name: "StaffDTO" },
    offerings: [{ id: `offering-${id}`, duration, name: "Taglio", price: 20 }],
    user: null,
  };
}

describe("timeline time values", () => {
  it("formats minute values", () => {
    expect(formatMinute(570)).toBe("09:30");
  });
});

describe("timeline scale", () => {
  it("uses the configured start minute as its origin", () => {
    const scale = createTimelineScale(config);
    expect(scale.minuteToTop(570)).toBe(0);
    expect(scale.minuteToTop(600)).toBe(60);
    expect(scale.height).toBe(300);
  });

  it("clamps coordinates when converting back to time", () => {
    const scale = createTimelineScale(config);
    expect(scale.topToMinute(-10)).toBe(570);
    expect(scale.topToMinute(60)).toBe(600);
    expect(scale.topToMinute(500)).toBe(720);
  });

  it("generates real clock-hour labels and the end boundary", () => {
    const ticks = createTimelineTicks(config);
    expect(ticks.filter((tick) => tick.label).map((tick) => tick.label)).toEqual([
      "09:30",
      "10:00",
      "11:00",
      "12:00",
    ]);
    expect(ticks.at(-1)?.top).toBe(300);
  });
});

describe("reservation layout", () => {
  it("positions and clips reservations against the visible range", () => {
    const layouts = layoutReservations(
      [
        reservation("before", "09:15", 30),
        reservation("inside", "10:00", 25),
        reservation("after", "11:45", 30),
      ],
      config,
    );

    expect(layouts.map(({ reservation }) => reservation.id)).toEqual(["before", "inside", "after"]);
    expect(layouts[0]).toMatchObject({ top: 0, height: 30, clippedAtStart: true });
    expect(layouts[1]).toMatchObject({
      top: 60,
      height: 50,
      clippedAtStart: false,
      clippedAtEnd: false,
    });
    expect(layouts[2]).toMatchObject({ top: 270, height: 30, clippedAtEnd: true });
  });

  it("uses the combined duration of all reservation services", () => {
    const multiServiceReservation = reservation("multi", "10:00", 25);
    multiServiceReservation.offerings.push({
      id: "offering-multi-2",
      duration: 15,
      name: "Barba",
      price: 10,
    });

    const [layout] = layoutReservations([multiServiceReservation], config);

    expect(layout).toMatchObject({
      startMinute: 600,
      endMinute: 640,
      height: 80,
    });
  });

  it("excludes invalid and fully out-of-range reservations", () => {
    expect(
      layoutReservations(
        [
          reservation("early", "08:00", 30),
          reservation("late", "12:00", 30),
          reservation("zero", "10:00", 0),
        ],
        config,
      ),
    ).toEqual([]);
  });

  it("places overlapping reservations in columns and reuses free columns", () => {
    const layouts = layoutReservations(
      [reservation("a", "10:00", 60), reservation("b", "10:15", 20), reservation("c", "10:35", 15)],
      config,
    );

    expect(layouts.map(({ column, columnCount }) => [column, columnCount])).toEqual([
      [0, 2],
      [1, 2],
      [1, 2],
    ]);
  });
});
