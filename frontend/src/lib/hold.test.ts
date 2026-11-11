import { describe, expect, test } from "vitest";
import { effectiveStatus, formatRemaining, isValidStudentId } from "./hold";

describe("isValidStudentId", () => {
  test.each(["20152691234567890", "00000000000000000"])("accepts 17 digits: %s", (id) => {
    expect(isValidStudentId(id)).toBe(true);
  });

  test.each([
    ["16 digits", "2015269123456789"],
    ["18 digits", "201526912345678901"],
    ["a letter", "2015269123456789a"],
    ["a space", "2015269 234567890"],
    ["empty", ""],
    ["Bengali digits", "২০১৫২৬৯১২৩৪৫৬৭৮৯০"],
  ])("rejects %s", (_label, id) => {
    expect(isValidStudentId(id)).toBe(false);
  });
});

describe("effectiveStatus (what the screen shows)", () => {
  const now = Date.parse("2026-11-11T10:00:00Z");

  test("a HELD hold whose time is up is shown as EXPIRED", () => {
    expect(effectiveStatus("HELD", "2026-11-11T09:59:59Z", now)).toBe("EXPIRED");
    expect(effectiveStatus("HELD", "2026-11-11T10:00:00Z", now)).toBe("EXPIRED");
  });

  test("a HELD hold with time left stays HELD", () => {
    expect(effectiveStatus("HELD", "2026-11-11T10:00:01Z", now)).toBe("HELD");
  });

  test("final states never change, even after the expiry time", () => {
    expect(effectiveStatus("CONFIRMED", "2026-11-11T09:00:00Z", now)).toBe("CONFIRMED");
    expect(effectiveStatus("CANCELLED", "2026-11-11T09:00:00Z", now)).toBe("CANCELLED");
  });
});

describe("formatRemaining", () => {
  test.each([
    [600_000, "10:00"],
    [90_000, "01:30"],
    [59_001, "01:00"],   // rounds up: never shows 00:00 while time is left
    [1, "00:01"],
    [0, "00:00"],
    [-5_000, "00:00"],   // never negative
  ])("%i ms -> %s", (ms, text) => {
    expect(formatRemaining(ms)).toBe(text);
  });
});
