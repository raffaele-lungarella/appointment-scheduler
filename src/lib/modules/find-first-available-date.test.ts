import { CalendarDate } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import { findFirstAvailableDate } from "./find-first-available-date";

describe("findFirstAvailableDate", () => {
  const start = new CalendarDate(2026, 7, 31);

  it("returns today when it is available", () => {
    expect(findFirstAvailableDate(start, () => true)?.toString()).toBe("2026-07-31");
  });

  it("returns the first available future date", () => {
    expect(
      findFirstAvailableDate(
        start,
        (date) => date.compare(start.add({ days: 3 })) === 0,
      )?.toString(),
    ).toBe("2026-08-03");
  });

  it("returns undefined when no date is available in the search window", () => {
    expect(findFirstAvailableDate(start, () => false, 7)).toBeUndefined();
  });
});
