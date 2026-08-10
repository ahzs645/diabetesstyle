import { describe, expect, it } from "vitest";
import {
  ADAG_OFFSET,
  ADAG_SLOPE,
  cumulativeEa1c,
  dailyMeans,
  ea1cPercent,
  gmiPercent,
  ngspToIfcc,
  trailingEa1c,
} from "./a1c";
import type { GlucoseReading } from "./types";

function reading(iso: string, mgdl: number): GlucoseReading {
  return { time: new Date(iso), serial: "A", mgdl, historic: true };
}

describe("A1C formulas", () => {
  it("matches the ADAG regression", () => {
    // 5.5% corresponds to a mean of 111.15 mg/dL: 5.5 × 28.7 − 46.7
    expect(ea1cPercent(111.15)).toBeCloseTo(5.5, 5);
    expect(ea1cPercent(154)).toBeCloseTo(6.99, 2);
  });

  it("converts NGSP % to IFCC mmol/mol", () => {
    // published anchor points of the master equation
    expect(ngspToIfcc(5.0)).toBeCloseTo(31.1, 1);
    expect(ngspToIfcc(7.0)).toBeCloseTo(53.0, 1);
    // the LibreLink screen: 5.53% shows as 37 mmol/mol
    expect(Math.round(ngspToIfcc(ea1cPercent(111.9)))).toBe(37);
  });

  it("matches the GMI regression", () => {
    expect(gmiPercent(100)).toBeCloseTo(5.7, 1);
    expect(gmiPercent(200)).toBeCloseTo(8.1, 1);
  });
});

describe("mmol/L display constants", () => {
  // The report prints its own arithmetic, so the constants it substitutes
  // must reproduce the result it shows. The ADAG paper's rounded mmol/L pair
  // (2.59 / 1.59) does not; the mg/dL pair divided by the conversion factor
  // does. Guard the property rather than the numbers.
  const MGDL_PER_MMOL = 18.016;

  it("reproduces the mg/dL result from a mean shown in mmol/L", () => {
    const offset = ADAG_OFFSET / MGDL_PER_MMOL;
    const slope = ADAG_SLOPE / MGDL_PER_MMOL;
    for (const meanMgdl of [70, 112.4126, 154, 240]) {
      const shown = Number((meanMgdl / MGDL_PER_MMOL).toFixed(2));
      const fromMmol = (shown + offset) / slope;
      // agrees with the mg/dL path to the two decimals the screen prints
      expect(fromMmol).toBeCloseTo(ea1cPercent(meanMgdl), 2);
    }
  });

  it("is the case the paper's rounded pair misses", () => {
    const shown = 6.24; // 112.4 mg/dL, the dataset's 14-day mean
    const rounded = (shown + 2.59) / 1.59;
    const derived = (shown + ADAG_OFFSET / MGDL_PER_MMOL) / (ADAG_SLOPE / MGDL_PER_MMOL);
    expect(rounded.toFixed(2)).toBe("5.55");
    expect(derived.toFixed(2)).toBe("5.54");
    expect(ea1cPercent(112.4126).toFixed(2)).toBe("5.54");
  });
});

describe("daily series", () => {
  const readings = [
    reading("2026-07-01T08:00", 100),
    reading("2026-07-01T09:00", 110),
    // no data on 2026-07-02
    reading("2026-07-03T08:00", 130),
  ];
  const from = new Date(2026, 6, 1);
  const to = new Date(2026, 6, 4);

  it("computes per-day means with gaps", () => {
    const daily = dailyMeans(readings, from, to);
    expect(daily).toHaveLength(3);
    expect(daily[0].meanMgdl).toBeCloseTo(105);
    expect(daily[0].n).toBe(2);
    expect(daily[1].meanMgdl).toBeNull();
    expect(daily[2].meanMgdl).toBeCloseTo(130);
  });

  it("accumulates a running mean across days", () => {
    const cum = cumulativeEa1c(dailyMeans(readings, from, to));
    expect(cum[0]!.meanMgdl).toBeCloseTo(105);
    // gap day carries the running value forward
    expect(cum[1]!.meanMgdl).toBeCloseTo(105);
    expect(cum[2]!.meanMgdl).toBeCloseTo((100 + 110 + 130) / 3);
    expect(cum[2]!.n).toBe(3);
    expect(cum[2]!.ea1cPercent).toBeCloseTo(ea1cPercent((100 + 110 + 130) / 3));
  });

  it("computes a trailing-window mean", () => {
    const daily = dailyMeans(readings, from, to);
    const trail = trailingEa1c(daily, 2);
    // day 3 with a 2-day window covers only day 3 (day 2 is empty)
    expect(trail[2]!.meanMgdl).toBeCloseTo(130);
    expect(trail[2]!.n).toBe(1);
    // a 3-day window reaches back to day 1
    const wide = trailingEa1c(daily, 3);
    expect(wide[2]!.meanMgdl).toBeCloseTo((100 + 110 + 130) / 3);
    // leading edge: day 1 only sees itself
    expect(trail[0]!.meanMgdl).toBeCloseTo(105);
    // empty day yields null
    expect(trailingEa1c(daily, 1)[1]).toBeNull();
  });
});
