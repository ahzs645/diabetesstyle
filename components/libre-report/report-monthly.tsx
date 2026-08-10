import type { ReactElement } from "react";
import {
  formatGlucose,
  glucoseUnitLabel,
  makeT,
  monthName,
  weekdayName,
} from "../../lib/libre-report/i18n";
import { dayKey } from "../../lib/libre-report/day";
import type { DayStats } from "../../lib/libre-report/stats";
import type { ReportContext } from "./context";
import { LowEventIcon, ScanIcon, SensorIcon } from "./icons";
import { ReportPage } from "./report-header";

/**
 * Monthly Summary: a Monday-first calendar of the month containing the
 * report period's last day, matching the printed layout.
 */
export function MonthlySummaryReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { lang, unit } = ctx;
  const lastDay = new Date(ctx.period.end);
  lastDay.setDate(lastDay.getDate() - 1);
  const year = lastDay.getFullYear();
  const month = lastDay.getMonth();

  const byKey = new Map(ctx.days.map((d) => [d.key, d]));
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first column index for the 1st of the month.
  const lead = (firstOfMonth.getDay() + 6) % 7;
  const cells: (DayStats | { day: Date } | null)[] = Array.from(
    { length: lead },
    () => null,
  );
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dayKey(date);
    cells.push(byKey.get(key) ?? { day: date });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <ReportPage
      ctx={ctx}
      title={t("monthlySummary")}
      subtitle={`${monthName(month, lang)} ${year}`}
      id="monthly-summary"
    >
      <div className="lr-monthly-wrap">
        <table className="lr-calendar">
          <thead>
            <tr>
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                <th key={dow}>{weekdayName(dow, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) => (
                  <td key={ci} className="lr-cal-cell">
                    {cell ? (
                      <div className="lr-cal-inner">
                        <div className="lr-cal-daynum">{cell.day.getDate()}</div>
                        {"averageGlucose" in cell && cell.averageGlucose !== null ? (
                          <div className="lr-cal-data">
                            <div className="lr-cal-avg">
                              <b dir="ltr">{formatGlucose(cell.averageGlucose, unit, lang)}</b>{" "}
                              <span className="lr-cal-unit">{glucoseUnitLabel(unit, lang)}</span>
                            </div>
                            <div className="lr-cal-scans">
                              <b dir="ltr">{cell.scansViews}</b>{" "}
                              <span className="lr-cal-scan-icon"><ScanIcon /></span>
                            </div>
                            {"lowEvents" in cell && cell.lowEvents > 0 ? (
                              <div className="lr-cal-lows">
                                {Array.from({ length: Math.min(cell.lowEvents, 5) }).map(
                                  (_, i) => (
                                    <span key={i} className="lr-cal-low-icon">
                                      <LowEventIcon />
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="lr-cal-legend">
          <div>
            <span className="lr-cal-legend-icon"><SensorIcon /></span> {t("avgGlucoseLegend")}
          </div>
          <div>
            <span className="lr-cal-legend-icon"><ScanIcon /></span> {t("scansViews")}
          </div>
          <div>
            <span className="lr-cal-legend-icon lr-cal-low-icon"><LowEventIcon /></span>{" "}
            {t("lowGlucoseEventsLegend")}
          </div>
        </div>
      </div>
    </ReportPage>
  );
}
