/**
 * Calendar-day helpers, in the device's local time.
 *
 * A LibreView export carries local wall-clock timestamps with no zone, and
 * the reports are all about calendar days — "the days this window claims",
 * "the days this source recorded". Both helpers therefore work in local time
 * and never touch UTC, which would shift readings across day boundaries.
 *
 * They live in their own module because both `stats.ts` and `a1c.ts` need
 * them and `stats.ts` depends on `a1c.ts` for the GMI equation.
 */

/** Local midnight starting the calendar day `d` falls in. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "YYYY-MM-DD" in local time — a stable key for grouping by calendar day. */
export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
