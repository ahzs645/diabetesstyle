import type { GlucoseReading, LibreExport } from "./types";

/**
 * Analytics for LibreView-style reports. All computations follow the
 * conventions used by the printed reports:
 *  - statistics (average, GMI, CV, time-in-ranges, AGP) use HISTORIC
 *    (automatic 15-minute) readings only;
 *  - scans/views counts use scan readings;
 *  - a report period covers whole calendar days, inclusive of both ends.
 */

export interface GlucoseTargets {
  /** Lower bound of target range, mg/dL (default 70). */
  low: number;
  /** Upper bound of target range, mg/dL (default 180). */
  high: number;
  veryLow: number; // 54
  veryHigh: number; // 250
}

export const DEFAULT_TARGETS: GlucoseTargets = {
  veryLow: 54,
  low: 70,
  high: 180,
  veryHigh: 250,
};

export interface ReportPeriod {
  /** First day of the report, at local midnight. */
  start: Date;
  /** Exclusive end: local midnight AFTER the last report day. */
  end: Date;
  days: number;
}

/** Build a period ending on `endDay` (inclusive) spanning `days` days. */
export function makePeriod(endDay: Date, days: number): ReportPeriod {
  const end = startOfDay(endDay);
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end, days };
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function inPeriod(time: Date, period: ReportPeriod): boolean {
  return time >= period.start && time < period.end;
}

export function readingsInPeriod(
  data: LibreExport,
  period: ReportPeriod,
): GlucoseReading[] {
  return data.readings.filter((r) => inPeriod(r.time, period));
}

/** Minutes elapsed since local midnight. */
export function minutesOfDay(time: Date): number {
  return time.getHours() * 60 + time.getMinutes();
}

export interface TimeInRanges {
  veryLowPct: number;
  lowPct: number;
  targetPct: number;
  highPct: number;
  veryHighPct: number;
}

export interface PeriodStats {
  period: ReportPeriod;
  historicCount: number;
  scanCount: number;
  averageGlucose: number | null;
  sd: number | null;
  /** Glucose variability, % coefficient of variation. */
  cvPct: number | null;
  gmiPercent: number | null;
  gmiMmolMol: number | null;
  /** % of expected 15-minute readings captured during the period. */
  sensorActivePct: number | null;
  timeInRanges: TimeInRanges | null;
  lowEvents: LowGlucoseEvent[];
  averageScansPerDay: number;
  totalCarbsGrams: number | null;
  rapidInsulinPerDay: number | null;
  longInsulinPerDay: number | null;
  daysWithInsulinData: number;
  daysWithFoodData: number;
}

export interface LowGlucoseEvent {
  start: Date;
  end: Date;
  durationMin: number;
  /** Lowest reading during the event, mg/dL. */
  nadir: number;
}

const SLOT_MIN = 15; // the sensor stores one automatic reading per 15 minutes

/**
 * "Time sensor active": share of the period's 15-minute slots that captured
 * at least one reading (historic or scan). This tracks the printed reports
 * to within ~2 percentage points — LibreView's exact formula is not public.
 */
function sensorActiveSlotCoverage(
  readings: GlucoseReading[],
  period: ReportPeriod,
): number {
  const startMs = period.start.getTime();
  const slots = new Set<number>();
  for (const r of readings) {
    slots.add(Math.floor((r.time.getTime() - startMs) / (SLOT_MIN * 60000)));
  }
  const expected = period.days * ((24 * 60) / SLOT_MIN);
  return Math.min(100, (slots.size / expected) * 100);
}

export function computePeriodStats(
  data: LibreExport,
  period: ReportPeriod,
  targets: GlucoseTargets = DEFAULT_TARGETS,
): PeriodStats {
  const readings = readingsInPeriod(data, period);
  const historic = readings.filter((r) => r.historic);
  const scans = readings.filter((r) => !r.historic);
  const values = historic.map((r) => r.mgdl);

  const avg = values.length ? sum(values) / values.length : null;
  const sd =
    avg !== null && values.length > 1
      ? Math.sqrt(
          sum(values.map((v) => (v - avg) ** 2)) / (values.length - 1),
        )
      : null;
  const cv = avg !== null && sd !== null && avg > 0 ? (sd / avg) * 100 : null;

  const foodInPeriod = data.food.filter((f) => inPeriod(f.time, period));
  const insulinInPeriod = data.insulin.filter((f) => inPeriod(f.time, period));
  const carbs = foodInPeriod.reduce<number | null>(
    (acc, f) => (f.grams === null ? acc : (acc ?? 0) + f.grams),
    null,
  );
  const rapid = insulinInPeriod
    .filter((e) => e.kind === "rapid" && e.units !== null)
    .reduce<number | null>((acc, e) => (acc ?? 0) + (e.units as number), null);
  const long = insulinInPeriod
    .filter((e) => e.kind === "long" && e.units !== null)
    .reduce<number | null>((acc, e) => (acc ?? 0) + (e.units as number), null);

  return {
    period,
    historicCount: historic.length,
    scanCount: scans.length,
    averageGlucose: avg,
    sd,
    cvPct: cv,
    gmiPercent: avg !== null ? 3.31 + 0.02392 * avg : null,
    gmiMmolMol: avg !== null ? 12.71 + 4.70587 * (avg / 18.016) : null,
    sensorActivePct: readings.length
      ? sensorActiveSlotCoverage(readings, period)
      : null,
    timeInRanges: values.length ? computeTimeInRanges(values, targets) : null,
    lowEvents: findLowGlucoseEvents(historic, targets.low),
    averageScansPerDay: scans.length / period.days,
    totalCarbsGrams: carbs,
    rapidInsulinPerDay: rapid === null ? null : rapid / period.days,
    longInsulinPerDay: long === null ? null : long / period.days,
    daysWithInsulinData: countDaysWith(insulinInPeriod.map((e) => e.time)),
    daysWithFoodData: countDaysWith(foodInPeriod.map((e) => e.time)),
  };
}

function countDaysWith(times: Date[]): number {
  return new Set(times.map((t) => dayKey(t))).size;
}

export function computeTimeInRanges(
  values: number[],
  targets: GlucoseTargets = DEFAULT_TARGETS,
): TimeInRanges {
  let veryLow = 0;
  let low = 0;
  let target = 0;
  let high = 0;
  let veryHigh = 0;
  for (const v of values) {
    if (v < targets.veryLow) veryLow++;
    else if (v < targets.low) low++;
    else if (v <= targets.high) target++;
    else if (v <= targets.veryHigh) high++;
    else veryHigh++;
  }
  const n = values.length;
  return {
    veryLowPct: (veryLow / n) * 100,
    lowPct: (low / n) * 100,
    targetPct: (target / n) * 100,
    highPct: (high / n) * 100,
    veryHighPct: (veryHigh / n) * 100,
  };
}

/**
 * A low-glucose event = historic readings below `threshold` for at least
 * 15 minutes. Consecutive low readings separated by a data gap of more
 * than 45 minutes are treated as separate events.
 */
export function findLowGlucoseEvents(
  historic: GlucoseReading[],
  threshold: number,
): LowGlucoseEvent[] {
  const events: LowGlucoseEvent[] = [];
  let start: Date | null = null;
  let last: Date | null = null;
  let nadir = Infinity;

  const flush = () => {
    if (start && last) {
      const durationMin =
        (last.getTime() - start.getTime()) / 60000 + 15; // include reading interval
      if (durationMin >= 15) {
        events.push({ start, end: last, durationMin, nadir });
      }
    }
    start = null;
    last = null;
    nadir = Infinity;
  };

  for (const r of historic) {
    const isLow = r.mgdl < threshold;
    if (isLow) {
      if (
        start &&
        last &&
        r.time.getTime() - last.getTime() > 45 * 60000
      ) {
        flush();
      }
      if (!start) start = r.time;
      last = r.time;
      nadir = Math.min(nadir, r.mgdl);
    } else if (start) {
      flush();
    }
  }
  flush();
  return events;
}

/** Percentile with linear interpolation (values must be sorted). */
export function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface AgpProfile {
  /** Minutes since midnight for each bin centre. */
  binMinutes: number[];
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  /** Bins that actually contained data (others are interpolated). */
  binHasData: boolean[];
}

/**
 * Ambulatory Glucose Profile: readings pooled into time-of-day bins across
 * all days of the period, percentiles per bin, then smoothed with a
 * circular moving average — matching the printed AGP's smooth bands.
 */
export function computeAgpProfile(
  historic: GlucoseReading[],
  binSizeMin = 15,
  smoothWindow = 5,
): AgpProfile | null {
  if (historic.length === 0) return null;
  const binCount = Math.round((24 * 60) / binSizeMin);
  const bins: number[][] = Array.from({ length: binCount }, () => []);
  for (const r of historic) {
    const bin = Math.floor(minutesOfDay(r.time) / binSizeMin) % binCount;
    bins[bin].push(r.mgdl);
  }
  const binHasData = bins.map((b) => b.length > 0);
  // Fill empty bins from circular neighbours so smoothing has support.
  const percentiles = { p5: 5, p25: 25, p50: 50, p75: 75, p95: 95 } as const;
  const raw: Record<keyof typeof percentiles, number[]> = {
    p5: [],
    p25: [],
    p50: [],
    p75: [],
    p95: [],
  };
  for (let i = 0; i < binCount; i++) {
    let values = bins[i];
    if (values.length === 0) {
      // borrow nearest non-empty bins on both sides
      for (let d = 1; d < binCount && values.length === 0; d++) {
        const left = bins[(i - d + binCount) % binCount];
        const right = bins[(i + d) % binCount];
        values = [...left, ...right];
      }
      if (values.length === 0) return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    for (const key of Object.keys(percentiles) as (keyof typeof percentiles)[]) {
      raw[key].push(percentileSorted(sorted, percentiles[key]));
    }
  }
  const smooth = (series: number[]) => circularMovingAverage(series, smoothWindow);
  return {
    binMinutes: Array.from(
      { length: binCount },
      (_, i) => i * binSizeMin + binSizeMin / 2,
    ),
    p5: smooth(raw.p5),
    p25: smooth(raw.p25),
    p50: smooth(raw.p50),
    p75: smooth(raw.p75),
    p95: smooth(raw.p95),
    binHasData,
  };
}

export function circularMovingAverage(series: number[], window: number): number[] {
  if (window <= 1) return [...series];
  const half = Math.floor(window / 2);
  const n = series.length;
  return series.map((_, i) => {
    let acc = 0;
    for (let d = -half; d <= half; d++) {
      acc += series[(i + d + n) % n];
    }
    return acc / (2 * half + 1);
  });
}

export interface DayStats {
  day: Date;
  key: string;
  historic: GlucoseReading[];
  scans: GlucoseReading[];
  averageGlucose: number | null;
  scansViews: number;
  lowEvents: number;
  carbsGrams: number | null;
  rapidInsulin: number | null;
  longInsulin: number | null;
  /** Per-hour min/max of ALL readings, for the Daily Log table. */
  hourlyMax: (number | null)[];
  hourlyMin: (number | null)[];
}

export function computeDayStats(
  data: LibreExport,
  period: ReportPeriod,
  targets: GlucoseTargets = DEFAULT_TARGETS,
): DayStats[] {
  const readings = readingsInPeriod(data, period);
  const byDay = new Map<string, GlucoseReading[]>();
  for (const r of readings) {
    const key = dayKey(r.time);
    const list = byDay.get(key);
    if (list) list.push(r);
    else byDay.set(key, [r]);
  }
  const days: DayStats[] = [];
  for (let d = new Date(period.start); d < period.end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const key = dayKey(day);
    const all = byDay.get(key) ?? [];
    const historic = all.filter((r) => r.historic);
    const scans = all.filter((r) => !r.historic);
    const values = historic.map((r) => r.mgdl);
    const hourlyMax: (number | null)[] = Array.from({ length: 24 }, () => null);
    const hourlyMin: (number | null)[] = Array.from({ length: 24 }, () => null);
    for (const r of all) {
      const h = r.time.getHours();
      hourlyMax[h] = hourlyMax[h] === null ? r.mgdl : Math.max(hourlyMax[h], r.mgdl);
      hourlyMin[h] = hourlyMin[h] === null ? r.mgdl : Math.min(hourlyMin[h], r.mgdl);
    }
    const dayFood = data.food.filter((f) => dayKey(f.time) === key);
    const carbs = dayFood.reduce<number | null>(
      (acc, f) => (f.grams === null ? acc : (acc ?? 0) + f.grams),
      null,
    );
    const rapid = data.insulin
      .filter((e) => e.kind === "rapid" && e.units !== null && dayKey(e.time) === key)
      .reduce<number | null>((acc, e) => (acc ?? 0) + (e.units as number), null);
    const long = data.insulin
      .filter((e) => e.kind === "long" && e.units !== null && dayKey(e.time) === key)
      .reduce<number | null>((acc, e) => (acc ?? 0) + (e.units as number), null);
    days.push({
      day,
      key,
      historic,
      scans,
      averageGlucose: values.length ? sum(values) / values.length : null,
      scansViews: scans.length,
      lowEvents: findLowGlucoseEvents(historic, targets.low).length,
      carbsGrams: carbs,
      rapidInsulin: rapid,
      longInsulin: long,
      hourlyMax,
      hourlyMin,
    });
  }
  return days;
}

/** Average glucose per 2-hour block (12 values) for the Daily Patterns header. */
export function twoHourAverages(historic: GlucoseReading[]): (number | null)[] {
  const blocks: number[][] = Array.from({ length: 12 }, () => []);
  for (const r of historic) {
    blocks[Math.floor(minutesOfDay(r.time) / 120) % 12].push(r.mgdl);
  }
  return blocks.map((b) => (b.length ? sum(b) / b.length : null));
}

/**
 * Sensor-usage curve for the Snapshot report: for each time-of-day bin,
 * the % of period days that captured at least one historic reading there.
 */
export function sensorUsageByTime(
  historic: GlucoseReading[],
  days: number,
  binSizeMin = 30,
): number[] {
  const binCount = Math.round((24 * 60) / binSizeMin);
  const daysPerBin: Set<string>[] = Array.from({ length: binCount }, () => new Set());
  for (const r of historic) {
    const bin = Math.floor(minutesOfDay(r.time) / binSizeMin) % binCount;
    daysPerBin[bin].add(dayKey(r.time));
  }
  return daysPerBin.map((s) => Math.min(100, (s.size / days) * 100));
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
