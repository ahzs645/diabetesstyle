import type { ReactElement } from "react";
import {
  formatDayMonth,
  formatGlucose,
  makeT,
  weekdayName,
} from "../../lib/libre-report/i18n";
import { minutesOfDay } from "../../lib/libre-report/stats";
import type { FoodEntry } from "../../lib/libre-report/types";
import { MealPeriodChart } from "./charts";
import type { ReportContext } from "./context";
import { AppleIcon, DropIcon, MealPeriodIcon, RapidInsulinIcon } from "./icons";
import { ReportPage } from "./report-header";

interface MealPeriodDef {
  key: "morning" | "midday" | "evening" | "night";
  fromH: number;
  toH: number;
}

const MEAL_PERIODS: MealPeriodDef[] = [
  { key: "morning", fromH: 4, toH: 10 },
  { key: "midday", fromH: 10, toH: 16 },
  { key: "evening", fromH: 16, toH: 22 },
  { key: "night", fromH: 22, toH: 4 },
];

function inMealPeriod(time: Date, p: MealPeriodDef): boolean {
  const h = time.getHours();
  return p.fromH < p.toH ? h >= p.fromH && h < p.toH : h >= p.fromH || h < p.toH;
}

/** Average glucose curve in relative time (-1h..+3h) around logged meals. */
function mealCurve(
  ctx: ReportContext,
  meals: FoodEntry[],
): { relMinutes: number[]; values: number[] } | null {
  if (meals.length === 0) return null;
  const binSize = 15;
  const bins: number[][] = Array.from({ length: 16 }, () => []);
  const historic = ctx.data.readings.filter(
    (r) => r.historic && r.time >= ctx.period.start && r.time < ctx.period.end,
  );
  for (const meal of meals) {
    const t0 = meal.time.getTime();
    for (const r of historic) {
      const rel = (r.time.getTime() - t0) / 60000;
      if (rel < -60 || rel > 180) continue;
      bins[Math.min(15, Math.floor((rel + 60) / binSize))].push(r.mgdl);
    }
  }
  const relMinutes: number[] = [];
  const values: number[] = [];
  bins.forEach((b, i) => {
    if (b.length === 0) return;
    relMinutes.push(i * binSize - 60 + binSize / 2);
    values.push(b.reduce((a, v) => a + v, 0) / b.length);
  });
  return relMinutes.length > 1 ? { relMinutes, values } : null;
}

export function MealtimePatternsReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { lang, unit } = ctx;
  const mealsInPeriod = ctx.data.food.filter(
    (f) => f.time >= ctx.period.start && f.time < ctx.period.end,
  );

  return (
    <ReportPage ctx={ctx} title={t("mealtimePatterns")} id="mealtime-patterns">
      <div className="lr-meal-panels">
        {MEAL_PERIODS.map((p, i) => (
          <div key={p.key} className="lr-meal-panel">
            <div className="lr-meal-panel-title">
              <span className="lr-meal-icon">
                <MealPeriodIcon period={p.key} />
              </span>
              <b>{t(p.key)}</b>
              <span className="lr-meal-hours" dir="ltr">
                ({String(p.fromH).padStart(2, "0")}:00 - {String(p.toH).padStart(2, "0")}:00)
              </span>
            </div>
            <MealPeriodChart
              lang={lang}
              unit={unit}
              showSideLabels={i === 0 ? "pre" : i === MEAL_PERIODS.length - 1 ? "post" : undefined}
              mealCurves={mealCurve(
                ctx,
                mealsInPeriod.filter((m) => inMealPeriod(m.time, p)),
              )}
            />
            <div className="lr-meal-cols">
              <span title={t("glucoseReading")}><DropIcon /></span>
              <span title={t("glucoseReading")}><DropIcon /></span>
              <span title={t("rapidActingInsulin")}><RapidInsulinIcon /></span>
              <span title={t("carbs")}><AppleIcon /></span>
            </div>
          </div>
        ))}
      </div>

      <table className="lr-meal-grid">
        <tbody>
          <tr className="lr-meal-grid-avg">
            <th className="lr-meal-grid-day">{t("daily")}</th>
            {MEAL_PERIODS.map((p) => (
              <MealGridCells key={p.key} ctx={ctx} period={p} day={null} meals={mealsInPeriod} />
            ))}
          </tr>
          {ctx.days.map((day) => (
            <tr key={day.key}>
              <th className="lr-meal-grid-day">
                {weekdayName(day.day.getDay(), lang, true)} {formatDayMonth(day.day, lang)}
              </th>
              {MEAL_PERIODS.map((p) => (
                <MealGridCells key={p.key} ctx={ctx} period={p} day={day.day} meals={mealsInPeriod} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="lr-legend">
        <b>{t("legend")}</b>
        <span>
          <i className="lr-swatch lr-swatch-high" />{" "}
          {t("highGlucoseLegend", { v: formatGlucose(ctx.targets.veryHigh, unit, lang) })}
        </span>
        <span>
          <i className="lr-swatch lr-swatch-low" />{" "}
          {t("lowGlucoseLegend", { v: formatGlucose(ctx.targets.low, unit, lang) })}
        </span>
        <span>◻ {t("prePostAverages")}</span>
        <span>
          <i className="lr-swatch lr-swatch-scan" /> {t("glucoseReading")}
        </span>
        <span>▲ {t("glucoseAbove350", { v: formatGlucose(350, unit, lang) })}</span>
        <span><RapidInsulinIcon /> {t("rapidActingInsulin")}</span>
      </div>
    </ReportPage>
  );
}

function MealGridCells({
  ctx,
  period,
  day,
  meals,
}: {
  ctx: ReportContext;
  period: MealPeriodDef;
  day: Date | null;
  meals: FoodEntry[];
}): ReactElement {
  const relevant = meals.filter((m) => {
    if (!inMealPeriod(m.time, period)) return false;
    if (!day) return true;
    return (
      m.time.getFullYear() === day.getFullYear() &&
      m.time.getMonth() === day.getMonth() &&
      m.time.getDate() === day.getDate()
    );
  });
  const meal = relevant[0];
  let pre: number | null = null;
  let post: number | null = null;
  if (meal) {
    const t0 = meal.time.getTime();
    const historic = ctx.data.readings.filter((r) => r.historic);
    const preVals = historic
      .filter((r) => {
        const rel = (r.time.getTime() - t0) / 60000;
        return rel >= -60 && rel <= 0;
      })
      .map((r) => r.mgdl);
    const postVals = historic
      .filter((r) => {
        const rel = (r.time.getTime() - t0) / 60000;
        return rel > 0 && rel <= 180;
      })
      .map((r) => r.mgdl);
    pre = preVals.length ? preVals.reduce((a, v) => a + v, 0) / preVals.length : null;
    post = postVals.length ? postVals.reduce((a, v) => a + v, 0) / postVals.length : null;
  }
  return (
    <>
      <td className="lr-meal-cell">
        {pre === null ? "" : formatGlucose(pre, ctx.unit, ctx.lang)}
      </td>
      <td className="lr-meal-cell">
        {post === null ? "" : formatGlucose(post, ctx.unit, ctx.lang)}
      </td>
      <td className="lr-meal-cell" />
      <td className="lr-meal-cell lr-meal-cell-carb">
        {meal?.grams != null ? Math.round(meal.grams) : ""}
      </td>
    </>
  );
}

export { MEAL_PERIODS, minutesOfDay };
