import { describe, expect, it } from "vitest";
import { ea1cPercent } from "./a1c";
import {
  datasetBounds,
  filterBySource,
  mergedWindow,
  shortSerial,
  sourceDayMask,
  sourceWindow,
  sourceWindows,
  summarizeSources,
} from "./sources";
import { makePeriod } from "./stats";
import type { GlucoseReading, LibreExport } from "./types";

/** One historic reading per hour of `day` (2026-07-DD) at a fixed value. */
function dayReadings(serial: string, day: number, mgdl: number, count = 4): GlucoseReading[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(2026, 6, day, 6 + i),
    serial,
    mgdl,
    historic: true,
  }));
}

function exportOf(readings: GlucoseReading[]): LibreExport {
  return {
    title: "Glucose Data",
    generatedAt: "",
    generatedBy: "Tester",
    devices: ["FreeStyle LibreLink"],
    serials: [...new Set(readings.map((r) => r.serial))],
    sourceUnit: "mg/dL",
    readings: [...readings].sort((a, b) => a.time.getTime() - b.time.getTime()),
    insulin: [],
    food: [],
    notes: [],
    deviceEvents: [],
    strips: [],
  };
}

/**
 * The shape that produced the real-world discrepancy: an old instance runs
 * for most of the window at a higher mean, then a new phone takes over for
 * the last few days at a lower one.
 */
const OLD_PHONE = [
  ...dayReadings("OLD-1111", 1, 120),
  ...dayReadings("OLD-1111", 2, 120),
  ...dayReadings("OLD-1111", 3, 120),
  ...dayReadings("OLD-1111", 4, 120),
  ...dayReadings("OLD-1111", 5, 120),
  ...dayReadings("OLD-1111", 6, 120),
  ...dayReadings("OLD-1111", 7, 120),
  ...dayReadings("OLD-1111", 8, 120),
];
const NEW_PHONE = [
  ...dayReadings("NEW-2222", 9, 100),
  ...dayReadings("NEW-2222", 10, 100),
];
const data = exportOf([...OLD_PHONE, ...NEW_PHONE]);
// the claimed window: all ten days
const period = makePeriod(new Date(2026, 6, 10), 10);

describe("summarizeSources", () => {
  it("splits an export by serial, ordered by first appearance", () => {
    const sources = summarizeSources(data);
    expect(sources.map((s) => s.serial)).toEqual(["OLD-1111", "NEW-2222"]);
    expect(sources[0].historicCount).toBe(32);
    expect(sources[0].daysWithData).toBe(8);
    expect(sources[1].daysWithData).toBe(2);
    expect(sources[1].first).toEqual(new Date(2026, 6, 9, 6));
  });

  it("shortens serials to something a table can show", () => {
    expect(shortSerial("879C0BC1-D9A2-483A-B5B2-F8284595E96B")).toBe("879C0BC1");
    expect(shortSerial("")).toBe("—");
  });
});

describe("merged vs per-source windows", () => {
  it("pools every source over the period", () => {
    const w = mergedWindow(data, period);
    expect(w.n).toBe(40);
    expect(w.meanMgdl).toBeCloseTo((32 * 120 + 8 * 100) / 40);
    expect(w.daysWithData).toBe(10);
    expect(w.dayCoveragePct).toBe(100);
  });

  it("reproduces what a single instance alone would show", () => {
    const w = sourceWindow(data, "NEW-2222", period);
    expect(w.n).toBe(8);
    expect(w.meanMgdl).toBeCloseTo(100);
    expect(w.ea1cPercent).toBeCloseTo(ea1cPercent(100));
    // it is labelled with all ten days but only carries two of them
    expect(w.daysClaimed).toBe(10);
    expect(w.daysWithData).toBe(2);
    expect(w.dayCoveragePct).toBeCloseTo(20);
  });

  it("reports how full the claimed window really is", () => {
    // 8 readings against 10 days × 96 expected slots
    const w = sourceWindow(data, "NEW-2222", period);
    expect(w.readingCoveragePct).toBeCloseTo((8 / (10 * 96)) * 100);
    expect(mergedWindow(data, period).readingCoveragePct).toBeLessThan(100);
  });

  it("puts the per-source estimate below the merged one here", () => {
    const merged = mergedWindow(data, period);
    const [, fresh] = sourceWindows(data, period);
    expect(fresh.ea1cPercent!).toBeLessThan(merged.ea1cPercent!);
  });

  it("yields an empty window for a source with nothing in the period", () => {
    const earlier = makePeriod(new Date(2026, 5, 30), 3);
    const w = sourceWindow(data, "NEW-2222", earlier);
    expect(w.n).toBe(0);
    expect(w.meanMgdl).toBeNull();
    expect(w.ea1cPercent).toBeNull();
    expect(w.dayCoveragePct).toBe(0);
  });
});

describe("timeline helpers", () => {
  it("bounds the dataset to whole days", () => {
    const b = datasetBounds(data)!;
    expect(b.start).toEqual(new Date(2026, 6, 1));
    expect(b.dayCount).toBe(10);
  });

  it("marks only the days a source recorded", () => {
    const b = datasetBounds(data)!;
    const mask = sourceDayMask(data, "NEW-2222", b.start, b.dayCount);
    expect(mask).toEqual([
      false, false, false, false, false, false, false, false, true, true,
    ]);
  });

  it("returns null bounds for an export with no readings", () => {
    expect(datasetBounds(exportOf([]))).toBeNull();
  });
});

describe("filterBySource", () => {
  it("narrows every entry list to one instance", () => {
    const only = filterBySource(data, "NEW-2222");
    expect(only.readings).toHaveLength(8);
    expect(only.readings.every((r) => r.serial === "NEW-2222")).toBe(true);
    expect(only.serials).toEqual(["NEW-2222"]);
    // the original is untouched
    expect(data.readings).toHaveLength(40);
  });

  it("makes the merged window of the filtered export match the source window", () => {
    const only = filterBySource(data, "NEW-2222");
    expect(mergedWindow(only, period).meanMgdl).toBeCloseTo(
      sourceWindow(data, "NEW-2222", period).meanMgdl!,
    );
  });
});
