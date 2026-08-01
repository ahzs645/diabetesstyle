import { describe, expect, it } from "vitest";
import { ea1cPercent } from "./a1c";
import {
  datasetBounds,
  filterBySource,
  LOW_COVERAGE_PCT,
  mergedWindow,
  reconstructScreen,
  shortSerial,
  sourceDayMask,
  sourceWindow,
  sourceWindows,
  summarizeSources,
} from "./sources";
import { makePeriod } from "./stats";
import type { GlucoseReading, LibreExport } from "./types";

/**
 * `count` historic readings on 15-minute slots from midnight of `day`
 * (2026-07-DD) at a fixed value. Slots rather than hours so a full day's 96
 * readings stay inside the one calendar day, as the real export does.
 */
function dayReadings(serial: string, day: number, mgdl: number, count = 4): GlucoseReading[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(2026, 6, day, 0, i * 15),
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
    expect(sources[1].first).toEqual(new Date(2026, 6, 9));
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

describe("reconstructing an app screen", () => {
  /**
   * The shape the LibreLink app reports under its own caveat line: a 90-day
   * heading over an instance that only has the last handful of days. Both
   * observed screens had this form, one at 6 of 90 days and one at 7 of 90.
   */
  const fresh = exportOf([
    ...dayReadings("OLD-1111", 1, 120, 96),
    ...Array.from({ length: 7 }, (_, i) => dayReadings("NEW-2222", 25 + i, 112, 76)).flat(),
  ]);
  const ninety = makePeriod(new Date(2026, 6, 31), 90);

  it("counts days the way the app's caveat does", () => {
    const w = sourceWindow(fresh, "NEW-2222", ninety);
    expect(w.daysWithData).toBe(7);
    expect(w.daysClaimed).toBe(90);
  });

  it("flags the fresh instance but not the merged window", () => {
    expect(sourceWindow(fresh, "NEW-2222", ninety).dayCoveragePct).toBeLessThan(
      LOW_COVERAGE_PCT,
    );
    // the merged export still only has 8 days here, so build a full one
    const full = exportOf(
      Array.from({ length: 90 }, (_, i) => dayReadings("OLD-1111", 1, 120, 96).map((r) => ({
        ...r,
        time: new Date(2026, 4, 3 + i, r.time.getHours()),
      }))).flat(),
    );
    expect(mergedWindow(full, ninety).dayCoveragePct).toBeGreaterThanOrEqual(
      LOW_COVERAGE_PCT,
    );
  });

  it("still reports a confident-looking estimate from the thin slice", () => {
    // this is the whole problem: the number itself looks ordinary
    const w = sourceWindow(fresh, "NEW-2222", ninety);
    expect(w.meanMgdl).toBeCloseTo(112);
    expect(Math.round(w.ea1cPercent! * 10) / 10).toBeCloseTo(5.5);
    expect(Math.round(w.ifccMmolMol!)).toBe(37);
  });

  it("derives the heading a screen opened on a given day would carry", () => {
    // opening it on 31 July heads the screen "3 May – 31 July"
    const scr = reconstructScreen(fresh, "NEW-2222", new Date(2026, 6, 31), 90);
    expect(scr.period.start).toEqual(new Date(2026, 4, 3));
    expect(scr.period.end).toEqual(new Date(2026, 7, 1));
    expect(scr.source.daysWithData).toBe(7);
    // the merged export also holds the older instance's day inside that window
    expect(scr.merged.daysWithData).toBe(8);
  });

  it("moves with the day the screen was opened", () => {
    const earlier = reconstructScreen(fresh, "NEW-2222", new Date(2026, 6, 28), 90);
    expect(earlier.period.end).toEqual(new Date(2026, 6, 29));
    // only 25-28 July had happened yet
    expect(earlier.source.daysWithData).toBe(4);
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
