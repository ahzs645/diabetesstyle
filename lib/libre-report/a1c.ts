import { dayKey, type ReportPeriod } from "./stats";
import type { GlucoseReading } from "./types";

/**
 * Estimated A1C math, following what the LibreLink app displays:
 *  - eA1C (ADAG, Nathan et al. 2008): eA1C% = (mean mg/dL + 46.7) / 28.7
 *  - NGSP % -> IFCC mmol/mol master equation: 10.929 × (A1C% − 2.15)
 *  - GMI (Bergenstal et al. 2018): GMI% = 3.31 + 0.02392 × mean mg/dL
 * All formulas take the plain arithmetic mean of HISTORIC (automatic
 * 15-minute) readings; scans are excluded.
 */

export const ADAG_OFFSET = 46.7;
export const ADAG_SLOPE = 28.7;
/** ADAG constants for a mean expressed in mmol/L: (mean + 2.59) / 1.59. */
export const ADAG_OFFSET_MMOL = 2.59;
export const ADAG_SLOPE_MMOL = 1.59;

export const IFCC_SLOPE = 10.929;
export const IFCC_OFFSET = 2.15;

export const GMI_INTERCEPT = 3.31;
export const GMI_SLOPE = 0.02392;

/** Estimated A1C (NGSP %) from a mean glucose in mg/dL. */
export function ea1cPercent(meanMgdl: number): number {
  return (meanMgdl + ADAG_OFFSET) / ADAG_SLOPE;
}

/** NGSP % -> IFCC mmol/mol. */
export function ngspToIfcc(a1cPercent: number): number {
  return IFCC_SLOPE * (a1cPercent - IFCC_OFFSET);
}

/** GMI (%) from a mean glucose in mg/dL. */
export function gmiPercent(meanMgdl: number): number {
  return GMI_INTERCEPT + GMI_SLOPE * meanMgdl;
}

/** One calendar day's worth of historic readings, summarized. */
export interface DailyMean {
  day: Date;
  /** Mean of the day's historic readings, mg/dL; null when the day has none. */
  meanMgdl: number | null;
  n: number;
}

/** A point on an eA1C series; null slots mark days without enough data. */
export interface A1cPoint {
  day: Date;
  /** Mean glucose feeding the formula at this point, mg/dL. */
  meanMgdl: number;
  ea1cPercent: number;
  /** Number of readings behind the mean. */
  n: number;
}

/**
 * Per-day mean of historic readings for every calendar day in
 * [from, toExclusive) — days without readings yield meanMgdl null.
 */
export function dailyMeans(
  historic: GlucoseReading[],
  from: Date,
  toExclusive: Date,
): DailyMean[] {
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const r of historic) {
    const key = dayKey(r.time);
    const entry = byDay.get(key);
    if (entry) {
      entry.sum += r.mgdl;
      entry.n++;
    } else {
      byDay.set(key, { sum: r.mgdl, n: 1 });
    }
  }
  const out: DailyMean[] = [];
  for (let d = new Date(from); d < toExclusive; d.setDate(d.getDate() + 1)) {
    const entry = byDay.get(dayKey(d));
    out.push({
      day: new Date(d),
      meanMgdl: entry ? entry.sum / entry.n : null,
      n: entry?.n ?? 0,
    });
  }
  return out;
}

/**
 * Running value as the dataset accumulates: after each day, the mean of ALL
 * readings from the first day up to and including that day, and its eA1C.
 */
export function cumulativeEa1c(daily: DailyMean[]): (A1cPoint | null)[] {
  let sum = 0;
  let n = 0;
  return daily.map((d) => {
    if (d.meanMgdl !== null) {
      sum += d.meanMgdl * d.n;
      n += d.n;
    }
    if (n === 0) return null;
    const mean = sum / n;
    return { day: d.day, meanMgdl: mean, ea1cPercent: ea1cPercent(mean), n };
  });
}

/**
 * Rolling eA1C: for each day, the eA1C of the readings in the trailing
 * `windowDays`-day window ending on that day (the LibreLink "last 90 days"
 * behaviour, evaluated at every day of the dataset).
 */
export function trailingEa1c(
  daily: DailyMean[],
  windowDays: number,
): (A1cPoint | null)[] {
  const sums = [0];
  const counts = [0];
  daily.forEach((d, i) => {
    sums.push(sums[i] + (d.meanMgdl !== null ? d.meanMgdl * d.n : 0));
    counts.push(counts[i] + d.n);
  });
  return daily.map((d, i) => {
    const lo = Math.max(0, i + 1 - windowDays);
    const n = counts[i + 1] - counts[lo];
    if (n === 0) return null;
    const mean = (sums[i + 1] - sums[lo]) / n;
    return { day: d.day, meanMgdl: mean, ea1cPercent: ea1cPercent(mean), n };
  });
}

/** Sum + count of the historic readings inside a report period. */
export function periodTotals(
  historic: GlucoseReading[],
  period: ReportPeriod,
): { sum: number; n: number } {
  let sum = 0;
  let n = 0;
  for (const r of historic) {
    if (r.time >= period.start && r.time < period.end) {
      sum += r.mgdl;
      n++;
    }
  }
  return { sum, n };
}
