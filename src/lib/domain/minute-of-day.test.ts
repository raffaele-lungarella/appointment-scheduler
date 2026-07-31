import { describe, expect, it } from "vitest";

import {
  createMinuteOfDay,
  formatMinuteOfDay,
  minuteOfDay,
  minuteOfDayToTime,
  parseMinuteOfDay,
} from "./minute-of-day";

describe("MinuteOfDay", () => {
  it.each([
    ["09:00", 540],
    ["09:00:00", 540],
    ["540", 540],
    ["23:59", 1439],
  ])("parses %s", (input, expected) => {
    expect(parseMinuteOfDay(input)).toBe(expected);
  });

  it.each(["24:00", "09:60", "09:00:01", "-1", "1440", "nine"])("rejects %s", (input) => {
    expect(parseMinuteOfDay(input)).toBeNull();
  });

  it("constructs readable test values from time literals", () => {
    expect(minuteOfDay("10:00")).toBe(600);
    expect(() => minuteOfDay("24:00")).toThrow(RangeError);
  });

  it("rejects invalid numeric construction", () => {
    expect(() => createMinuteOfDay(-1)).toThrow(RangeError);
    expect(() => createMinuteOfDay(1440)).toThrow(RangeError);
    expect(() => createMinuteOfDay(1.5)).toThrow(RangeError);
  });

  it("formats and converts valid values", () => {
    const value = createMinuteOfDay(555);
    expect(formatMinuteOfDay(value)).toBe("09:15");
    expect(minuteOfDayToTime(value).toString()).toBe("09:15:00");
  });
});
