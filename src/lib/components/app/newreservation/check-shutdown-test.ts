import type { ShutdownDTO } from "$lib/dto";
import { parseDate } from "@internationalized/date";
import { describe, it, expect } from "vitest";

import { checkShutdown } from "./check-shutdown";

describe("isDateUnavailable", () => {
  const staffID1 = "staff-1";
  const staffID2 = "staff-2";

  it("should return false when there are no shutdown periods", () => {
    const date = parseDate("2024-08-15");
    const shutdowns: ShutdownDTO[] = [];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });

  it("should return false when date is before the shutdown period", () => {
    const date = parseDate("2024-07-15");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });

  it("should return false when date is after the shutdown period", () => {
    const date = parseDate("2024-08-20");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });

  it("should return true when date is on the first day of shutdown period", () => {
    const date = parseDate("2024-08-01");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should return true when date is on the last day of shutdown period", () => {
    const date = parseDate("2024-08-05");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should return true when date is in the middle of shutdown period", () => {
    const date = parseDate("2024-08-03");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should return false when checking different staff member shutdown", () => {
    const date = parseDate("2024-08-03");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID2)).toBe(false);
  });

  it("should handle multiple shutdown periods for the same staff and find matching period", () => {
    const date = parseDate("2024-09-03");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-07-01", end: "2024-07-05" },
      { id: "2", staffID: staffID1, start: "2024-08-10", end: "2024-08-15" },
      { id: "3", staffID: staffID1, start: "2024-09-01", end: "2024-09-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should check all shutdown periods when date is not in first period", () => {
    const date = parseDate("2024-07-03");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-09-01", end: "2024-09-05" },
      { id: "2", staffID: staffID1, start: "2024-07-01", end: "2024-07-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should handle unordered shutdown periods correctly", () => {
    const date = parseDate("2024-06-15");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
      { id: "2", staffID: staffID1, start: "2024-06-10", end: "2024-06-20" },
      { id: "3", staffID: staffID1, start: "2024-10-01", end: "2024-10-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should return false when date falls between multiple shutdown periods", () => {
    const date = parseDate("2024-07-15");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-07-01", end: "2024-07-05" },
      { id: "2", staffID: staffID1, start: "2024-07-20", end: "2024-07-25" },
      { id: "3", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });

  it("should handle mixed staff shutdowns and only check the correct staff", () => {
    const date = parseDate("2024-08-03");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-07-01", end: "2024-07-05" },
      { id: "2", staffID: staffID2, start: "2024-08-01", end: "2024-08-05" },
      { id: "3", staffID: staffID1, start: "2024-09-01", end: "2024-09-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
    expect(checkShutdown(date, shutdowns, staffID2)).toBe(true);
  });

  it("should handle single day shutdown period", () => {
    const date = parseDate("2024-08-15");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-15", end: "2024-08-15" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(true);
  });

  it("should handle long shutdown periods spanning multiple months", () => {
    const testDate1 = parseDate("2024-08-15");
    const testDate2 = parseDate("2024-09-15");
    const testDate3 = parseDate("2024-10-15");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-10-31" },
    ];

    expect(checkShutdown(testDate1, shutdowns, staffID1)).toBe(true);
    expect(checkShutdown(testDate2, shutdowns, staffID1)).toBe(true);
    expect(checkShutdown(testDate3, shutdowns, staffID1)).toBe(true);
  });

  it("should return false for date one day before shutdown starts", () => {
    const date = parseDate("2024-07-31");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });

  it("should return false for date one day after shutdown ends", () => {
    const date = parseDate("2024-08-06");
    const shutdowns: ShutdownDTO[] = [
      { id: "1", staffID: staffID1, start: "2024-08-01", end: "2024-08-05" },
    ];

    expect(checkShutdown(date, shutdowns, staffID1)).toBe(false);
  });
});
