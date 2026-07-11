import type { ReactElement } from "react";
import { formatDayMonth, formatNumber, makeT, weekdayName } from "../../lib/libre-report/i18n";
import { AutoWidth } from "./auto-width";
import { DayChart } from "./charts";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";

export function WeeklySummaryReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { targets, lang } = ctx;
  return (
    <ReportPage ctx={ctx} title={t("weeklySummary")} id="weekly-summary">
      <div className="lr-weekly-headings">
        <span className="lr-weekly-h lr-weekly-h-glucose">{t("averageGlucose")}</span>
        <span className="lr-weekly-h">{t("totalCarbs")}</span>
        <span className="lr-weekly-h">{t("totalDailyInsulin")}</span>
        <span className="lr-weekly-h">{t("lowsCount")}</span>
      </div>
      {ctx.days.map((day) => (
        <div key={day.key} className="lr-weekly-row">
          <div className="lr-weekly-day">
            <div className="lr-weekly-day-name">{weekdayName(day.day.getDay(), lang)}</div>
            <div className="lr-weekly-day-date">{formatDayMonth(day.day, lang)}</div>
          </div>
          <div className="lr-weekly-chart">
            <AutoWidth min={200}>
              {(w) => (
                <DayChart
                  historic={day.historic}
                  scans={day.scans}
                  targets={targets}
                  lang={lang}
                  height={96}
                  width={w}
                />
              )}
            </AutoWidth>
          </div>
          <div className="lr-weekly-cells">
            <div className="lr-weekly-cell">
              <span className="lr-weekly-icon">📱</span>
              <b dir="ltr">
                {day.averageGlucose === null ? "—" : formatNumber(day.averageGlucose, lang)}
              </b>
              <span className="lr-weekly-unit">{t("mgdl")}</span>
            </div>
            <div className="lr-weekly-cell">
              {day.carbsGrams === null ? (
                <span className="lr-weekly-blank" />
              ) : (
                <>
                  <b dir="ltr">{formatNumber(day.carbsGrams, lang)}</b>
                  <span className="lr-weekly-unit">{t("gramsUnit")}</span>
                </>
              )}
            </div>
            <div className="lr-weekly-cell">
              {day.rapidInsulin === null && day.longInsulin === null ? (
                <span className="lr-weekly-blank" />
              ) : (
                <b dir="ltr">
                  {formatNumber((day.rapidInsulin ?? 0) + (day.longInsulin ?? 0), lang, 1)}
                </b>
              )}
            </div>
            <div className="lr-weekly-cell">
              <span className="lr-weekly-icon lr-weekly-low-icon">⬇</span>
              <b dir="ltr">{day.lowEvents}</b>
            </div>
          </div>
        </div>
      ))}
      <div className="lr-legend">
        <b>{t("legend")}</b>
        <span>
          <i className="lr-swatch lr-swatch-scan" /> {t("scansViews")}
        </span>
        <span>● {t("newSensor")}</span>
        <span>🕐 {t("timeChange")}</span>
        <span>✎ {t("rapidActingInsulin")}</span>
        <span>💉 {t("longActingInsulin")}</span>
      </div>
    </ReportPage>
  );
}
