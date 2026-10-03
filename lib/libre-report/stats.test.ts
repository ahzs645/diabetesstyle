import { describe, expect, it } from "vitest";
import { makePeriod, readingsInPeriod } from "./stats";
import type { GlucoseReading, LibreExport } from "./types";

function exportOf(readings: GlucoseReading[]): LibreExport {
  return {
    title: "Glucose Data",
    generatedAt: "",
    generatedBy: "Tester",
    devices: [],
    devicesBySerial: {},
    serials: ["A"],
    sourceUnit: "mg/dL",
    readings,
    insulin: [],
    food: [],
    notes: [],
    deviceEvents: [],
    strips: [],
  };
}

function reading(day: number, hour: number, minute = 0): GlucoseReading {
  return {
    time: new Date(2026, 6, day, hour, minute),
    serial: "A",
    mgdl: 100 + day,
    historic: true,
  };
}

// a reading every 6 hours over 10 days, plus readings exactly on midnight
// so both period edges are exercised
const SORTED = Array.from({ length: 10 }, (_, i) =>
  [0, 6, 12, 18].map((h) => reading(i + 1, h)),
)
  .flat()
  .concat(reading(10, 23, 59));

describe("readingsInPeriod", () => {
  const period = makePeriod(new Date(2026, 6, 7), 3); // 5, 6, 7 July

  it("keeps the start midnight and drops the end midnight", () => {
    const got = readingsInPeriod(exportOf(SORTED), period);
    expect(got).toHaveLength(12);
    expect(got[0].time).toEqual(new Date(2026, 6, 5, 0, 0));
    expect(got.at(-1)!.time).toEqual(new Date(2026, 6, 7, 18, 0));
  });

  it("matches a plain filter on sorted input", () => {
    for (let end = 1; end <= 11; end++) {
      for (const days of [1, 3, 7, 30]) {
        const p = makePeriod(new Date(2026, 6, end), days);
        const expected = SORTED.filter((r) => r.time >= p.start && r.time < p.end);
        expect(readingsInPeriod(exportOf(SORTED), p)).toEqual(expected);
      }
    }
  });

  it("still filters correctly when readings are out of order", () => {
    const shuffled = [...SORTED].reverse();
    const got = readingsInPeriod(exportOf(shuffled), period);
    expect(got).toHaveLength(12);
    expect(got.every((r) => r.time >= period.start && r.time < period.end)).toBe(true);
  });

  it("returns nothing for a period outside the data", () => {
    const p = makePeriod(new Date(2026, 7, 20), 7);
    expect(readingsInPeriod(exportOf(SORTED), p)).toEqual([]);
  });
});
