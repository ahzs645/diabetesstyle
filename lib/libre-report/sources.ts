import { ea1cPercent, ngspToIfcc } from "./a1c";
import { dayKey, startOfDay, type ReportPeriod } from "./stats";
import type { GlucoseReading, LibreExport } from "./types";

/**
 * Splitting an export back into its data sources.
 *
 * A LibreView account merges every app instance that ever uploaded to it: a
 * new phone, an app reinstall or a second reader each appear as their own
 * serial number. Printed LibreView reports pool them into one series, which
 * is usually what you want.
 *
 * The LibreLink app on a given phone is different — it computes its screens
 * from ITS OWN local database. A freshly set-up instance has no history to
 * average, yet its report is still headed with the nominal window ("last 90
 * days"). The result is a number that cannot be reproduced from the merged
 * export, and that looks like a glycemic change when it is really a change
 * of phone.
 *
 * These helpers make that visible: per-source spans, per-source coverage of
 * a claimed report window, and the value each source alone would have shown.
 */

/** Expected automatic readings per day (one per 15-minute slot). */
export const READINGS_PER_DAY = 96;

/**
 * Coverage below this share of the claimed window makes a period average
 * unrepresentative. LibreView's own reports use a comparable rule of thumb
 * for whether a period has enough sensor data to report on.
 *
 * Measured in DAYS, not readings: the LibreLink app's own caveat under the
 * Estimated A1C counts days ("مدى البيانات 7 من 90 أيام" — data range 7 of
 * 90 days), and days are what the artifact is about, a window claiming
 * calendar time it has no data for. Judging by readings instead would nag
 * about ordinary sensor gaps, which is a different problem.
 */
export const LOW_COVERAGE_PCT = 70;

/** Enough of a serial to tell instances apart without printing the whole GUID. */
export function shortSerial(serial: string): string {
  return serial.slice(0, 8) || "—";
}

export interface SourceSummary {
  serial: string;
  short: string;
  /** Device display name(s) this serial reported under. */
  devices: string[];
  /** First and last glucose reading carrying this serial. */
  first: Date;
  last: Date;
  historicCount: number;
  scanCount: number;
  /** Distinct calendar days carrying at least one historic reading. */
  daysWithData: number;
}

/**
 * Every source that contributed glucose readings, ordered by when it first
 * appears. Sources with no readings at all (event-only serials) are skipped.
 */
export function summarizeSources(data: LibreExport): SourceSummary[] {
  const bySerial = new Map<
    string,
    {
      first: Date;
      last: Date;
      historic: number;
      scans: number;
      days: Set<string>;
      devices: Set<string>;
    }
  >();
  for (const r of data.readings) {
    let entry = bySerial.get(r.serial);
    if (!entry) {
      entry = {
        first: r.time,
        last: r.time,
        historic: 0,
        scans: 0,
        days: new Set(),
        devices: new Set(),
      };
      bySerial.set(r.serial, entry);
    }
    if (r.time < entry.first) entry.first = r.time;
    if (r.time > entry.last) entry.last = r.time;
    if (r.historic) {
      entry.historic++;
      entry.days.add(dayKey(r.time));
    } else {
      entry.scans++;
    }
  }
  // The export does not tie a device name to a serial row-by-row in a way we
  // keep, so a source shows every device name in the file when there is more
  // than one; with a single device name that is exactly right.
  const devices = data.devices;
  return [...bySerial.entries()]
    .map(([serial, e]) => ({
      serial,
      short: shortSerial(serial),
      devices,
      first: e.first,
      last: e.last,
      historicCount: e.historic,
      scanCount: e.scans,
      daysWithData: e.days.size,
    }))
    .sort((a, b) => a.first.getTime() - b.first.getTime());
}

/** The numbers one slice of data produces, plus how much of a window it fills. */
export interface SourceWindow {
  serial: string | null;
  short: string;
  /** Historic readings behind the mean. */
  n: number;
  scanCount: number;
  meanMgdl: number | null;
  ea1cPercent: number | null;
  ifccMmolMol: number | null;
  /** Earliest / latest historic reading counted; null when n is 0. */
  first: Date | null;
  last: Date | null;
  /** Days of the claimed window that carry at least one historic reading. */
  daysWithData: number;
  /** Days the window claims to cover. */
  daysClaimed: number;
  /** daysWithData / daysClaimed, as a percentage. */
  dayCoveragePct: number;
  /** n / (daysClaimed × 96), as a percentage — how full the window really is. */
  readingCoveragePct: number;
}

function buildWindow(
  serial: string | null,
  historic: GlucoseReading[],
  scanCount: number,
  daysClaimed: number,
): SourceWindow {
  let sum = 0;
  let first: Date | null = null;
  let last: Date | null = null;
  const days = new Set<string>();
  for (const r of historic) {
    sum += r.mgdl;
    days.add(dayKey(r.time));
    if (first === null || r.time < first) first = r.time;
    if (last === null || r.time > last) last = r.time;
  }
  const n = historic.length;
  const mean = n > 0 ? sum / n : null;
  const exact = mean === null ? null : ea1cPercent(mean);
  return {
    serial,
    short: serial === null ? "" : shortSerial(serial),
    n,
    scanCount,
    meanMgdl: mean,
    ea1cPercent: exact,
    ifccMmolMol: exact === null ? null : ngspToIfcc(exact),
    first,
    last,
    daysWithData: days.size,
    daysClaimed,
    dayCoveragePct: daysClaimed > 0 ? (days.size / daysClaimed) * 100 : 0,
    readingCoveragePct:
      daysClaimed > 0 ? (n / (daysClaimed * READINGS_PER_DAY)) * 100 : 0,
  };
}

function inPeriod(time: Date, period: ReportPeriod): boolean {
  return time >= period.start && time < period.end;
}

/**
 * The merged view every other report uses: all sources pooled over the
 * period. This is the row the export supports.
 */
export function mergedWindow(
  data: LibreExport,
  period: ReportPeriod,
): SourceWindow {
  const inside = data.readings.filter((r) => inPeriod(r.time, period));
  return buildWindow(
    null,
    inside.filter((r) => r.historic),
    inside.filter((r) => !r.historic).length,
    period.days,
  );
}

/**
 * What ONE source alone would show for the same claimed window — the phone's
 * view. Readings are clipped to the period exactly as the app clips to its
 * report window; the difference from `mergedWindow` is only that everything
 * the other instances recorded is missing, which is precisely what the app
 * cannot see.
 */
export function sourceWindow(
  data: LibreExport,
  serial: string,
  period: ReportPeriod,
): SourceWindow {
  const inside = data.readings.filter(
    (r) => r.serial === serial && inPeriod(r.time, period),
  );
  return buildWindow(
    serial,
    inside.filter((r) => r.historic),
    inside.filter((r) => !r.historic).length,
    period.days,
  );
}

/** Every source's own view of the period, ordered as `summarizeSources`. */
export function sourceWindows(
  data: LibreExport,
  period: ReportPeriod,
): SourceWindow[] {
  return summarizeSources(data).map((s) => sourceWindow(data, s.serial, period));
}

/**
 * Per-day presence mask for one source across `dayCount` days starting at
 * `from` — the raw material for the coverage timeline.
 */
export function sourceDayMask(
  data: LibreExport,
  serial: string,
  from: Date,
  dayCount: number,
): boolean[] {
  const days = new Set<string>();
  for (const r of data.readings) {
    if (r.serial === serial && r.historic) days.add(dayKey(r.time));
  }
  const start = startOfDay(from);
  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return days.has(dayKey(d));
  });
}

/** First and last day carrying any reading, at local midnight. */
export function datasetBounds(
  data: LibreExport,
): { start: Date; dayCount: number } | null {
  const first = data.readings[0]?.time;
  const last = data.readings.at(-1)?.time;
  if (!first || !last) return null;
  const start = startOfDay(first);
  const end = startOfDay(last);
  const dayCount =
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return { start, dayCount: Math.max(1, dayCount) };
}

/**
 * An export narrowed to a single source. Every report then renders exactly
 * what that one app instance could have produced.
 */
export function filterBySource(data: LibreExport, serial: string): LibreExport {
  const keep = <T extends { serial: string }>(rows: T[]) =>
    rows.filter((r) => r.serial === serial);
  return {
    ...data,
    serials: data.serials.filter((s) => s === serial),
    readings: keep(data.readings),
    insulin: keep(data.insulin),
    food: keep(data.food),
    notes: keep(data.notes),
    deviceEvents: keep(data.deviceEvents),
    strips: keep(data.strips),
  };
}
