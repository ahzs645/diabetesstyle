import type { ReactElement } from "react";
import {
  formatDayMonth,
  formatGlucose,
  makeT,
  weekdayName,
} from "../../lib/libre-report/i18n";
import { minutesOfDay } from "../../lib/libre-report/stats";
import { AutoWidth } from "./auto-width";
import { DayChart } from "./charts";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";

export function DailyLogReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { targets, lang, unit } = ctx;
  return (
    <ReportPage ctx={ctx} title={t("dailyLog")} id="daily-log">
      {ctx.days.map((day) => {
        const dayFood = ctx.data.food.filter(
          (f) => f.time >= day.day && f.time < addDays(day.day, 1),
        );
        const dayInsulin = ctx.data.insulin.filter(
          (e) => e.time >= day.day && e.time < addDays(day.day, 1),
        );
        const markers = [
          ...dayFood.map((f) => ({
            minutes: minutesOfDay(f.time),
            label: f.grams === null ? t("logged") : `${f.grams} ${t("gramsUnit")}`,
            kind: "food" as const,
          })),
          ...dayInsulin.map((e) => ({
            minutes: minutesOfDay(e.time),
            label:
              e.units === null
                ? t("logged")
                : `${e.units} ${t("unitsPerDay").split("/")[0]}`,
            kind: "insulin" as const,
          })),
        ];
        return (
          <div key={day.key} className="lr-log-day">
            <div className="lr-log-day-title">
              {weekdayName(day.day.getDay(), lang, true)} {formatDayMonth(day.day, lang)}
            </div>
            <AutoWidth>
              {(w) => (
                <DayChart
                  historic={day.historic}
                  scans={day.scans}
                  targets={targets}
                  lang={lang}
                  unit={unit}
                  markers={markers}
                  width={w}
                />
              )}
            </AutoWidth>
            <div className="lr-hscroll">
              <table className="lr-hourly-table" dir="ltr">
                <tbody>
                  <tr>
                    <th className="lr-hourly-head">{t("maxLabel")}</th>
                    {day.hourlyMax.map((v, i) => (
                      <td key={i}>{v === null ? "" : formatGlucose(v, unit, lang)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th className="lr-hourly-head">{t("minLabel")}</th>
                    {day.hourlyMin.map((v, i) => (
                      <td key={i}>{v === null ? "" : formatGlucose(v, unit, lang)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <DailyLogLegend ctx={ctx} />
    </ReportPage>
  );
}

export function DailyLogLegend({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { targets, lang, unit } = ctx;
  return (
    <div className="lr-legend">
      <b>{t("legend")}</b>
      <span>
        <i className="lr-swatch lr-swatch-high" />{" "}
        {t("highGlucoseLegend", { v: formatGlucose(targets.veryHigh, unit, lang) })}
      </span>
      <span>
        <i className="lr-swatch lr-swatch-low" />{" "}
        {t("lowGlucoseLegend", { v: formatGlucose(targets.low, unit, lang) })}
      </span>
      <span>
        <i className="lr-swatch lr-swatch-scan" /> {t("scansViews")}
      </span>
      <span>🍎 {t("logged")}</span>
      <span>▭ {t("postMealPeak")}</span>
      <span>● {t("newSensor")}</span>
      <span>🕐 {t("timeChange")}</span>
      <span>* {t("stripTest")}</span>
      <span dir="ltr">{t("insulinFormula")}</span>
    </div>
  );
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
