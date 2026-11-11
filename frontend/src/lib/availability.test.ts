import { describe, expect, test } from "vitest";
import type { SchoolClass } from "../api/types";
import { availability, summarize } from "./availability";

const cls = (total: number, held: number, confirmed: number): SchoolClass => ({
  id: "c", name: "Class", totalSeats: total, heldSeats: held, confirmedSeats: confirmed,
  availableSeats: Math.max(0, total - held - confirmed),
});

describe("availability badge", () => {
  test.each([
    ["plenty of places", cls(100, 0, 0), "available", "Places available"],
    ["31% left is still plenty", cls(100, 40, 29), "available", "Places available"],
    ["exactly 30% left is filling fast", cls(100, 40, 30), "filling", "Filling fast"],
    ["6 left is filling fast", cls(100, 50, 44), "filling", "Filling fast"],
    ["exactly 5 left is the last few", cls(100, 50, 45), "last", "Last few places"],
    ["1 left is the last few", cls(100, 50, 49), "last", "Last few places"],
    ["none left is full", cls(100, 50, 50), "full", "Full"],
    ["a tiny class with every seat free is already the last few", cls(3, 0, 0), "last", "Last few places"],
  ])("%s", (_name, c, level, label) => {
    expect(availability(c)).toMatchObject({ level, label });
  });

  test("used percent counts held and confirmed seats, capped at 100", () => {
    expect(availability(cls(200, 30, 20)).usedPercent).toBe(25);
    expect(availability({ totalSeats: 2, heldSeats: 2, confirmedSeats: 2, availableSeats: 0 }).usedPercent).toBe(100);
  });
});

describe("summarize (the four numbers on Home)", () => {
  test("adds up every class", () => {
    expect(summarize([cls(120, 15, 80), cls(60, 0, 10)])).toEqual({
      classes: 2, totalPlaces: 180, placesAvailable: 25 + 50, confirmed: 90,
    });
  });

  test("an empty school is all zeros", () => {
    expect(summarize([])).toEqual({ classes: 0, totalPlaces: 0, placesAvailable: 0, confirmed: 0 });
  });
});
