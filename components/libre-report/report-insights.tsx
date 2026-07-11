import type { ReactElement } from "react";
import {
  formatGlucose,
  formatNumber,
  formatPct,
  formatPeriod,
  glucoseUnitLabel,
  makeT,
} from "../../lib/libre-report/i18n";
import { readingsInPeriod } from "../../lib/libre-report/stats";
import { AutoWidth } from "./auto-width";
import { PatternsScatterChart, TimeInRangesBar } from "./charts";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";

export function PatternInsightsReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { stats, targets, lang, unit } = ctx;
  const tir = stats.timeInRanges;
  const unitLabel = glucoseUnitLabel(unit, lang);
  const historic = readingsInPeriod(ctx.data, ctx.period).filter((r) => r.historic);
  const pattern =
    stats.lowEvents.length > 0 ? t("lowsDetectedPattern") : t("noHarmfulPatterns");

  return (
    <ReportPage ctx={ctx} title={t("patternInsights")} id="pattern-insights">
      <div className="lr-insights-topline">
        <div>
          <b>{t("selectedDates")}: </b>
          {formatPeriod(ctx.period.start, ctx.period.end, ctx.period.days, lang)}
        </div>
        <div>
          <b>{t("timeSensorActive")}: </b>
          {stats.sensorActivePct === null
            ? "—"
            : formatPct(stats.sensorActivePct, lang)}
        </div>
      </div>

      <div className="lr-columns">
        <div className="lr-col">
          <div className="lr-box">
            <h3 className="lr-box-title">{t("timeInBands")}</h3>
            {tir ? (
              <TimeInRangesBar
                tir={[
                  { key: "veryHigh", pct: tir.veryHighPct },
                  { key: "high", pct: tir.highPct },
                  { key: "target", pct: tir.targetPct },
                  { key: "low", pct: tir.lowPct },
                  { key: "veryLow", pct: tir.veryLowPct },
                ]}
                targets={targets}
                lang={lang}
                unit={unit}
                height={210}
                goals={{
                  high: `${t("goal")}: <${formatPct(25, lang)}`,
                  target: `${t("goal")}: >${formatPct(70, lang)}`,
                  low: `${t("goal")}: <${formatPct(4, lang)}`,
                }}
              />
            ) : (
              <div className="lr-empty">{t("noData")}</div>
            )}
          </div>
        </div>
        <div className="lr-col">
          <div className="lr-box">
            <h3 className="lr-box-title">{t("glucoseStats")}</h3>
            <div className="lr-bigstat">
              <div className="lr-bigstat-label">{t("averageGlucose")}</div>
              <div className="lr-bigstat-value" dir="ltr">
                {stats.averageGlucose === null
                  ? "—"
                  : formatGlucose(stats.averageGlucose, unit, lang)}
                <span className="lr-bigstat-unit">{unitLabel}</span>
              </div>
              <div className="lr-bigstat-target">
                {t("target")}: ≤{formatGlucose(154, unit, lang)} {unitLabel}
              </div>
            </div>
            <hr className="lr-sep" />
            <div className="lr-bigstat">
              <div className="lr-bigstat-label">(GMI) {t("gmi")}</div>
              <div className="lr-bigstat-note">{t("gmiApprox")}</div>
              <div className="lr-bigstat-value" dir="ltr">
                {stats.gmiPercent === null
                  ? "—"
                  : unit === "mmol/L"
                    ? formatNumber(stats.gmiMmolMol!, lang)
                    : formatNumber(stats.gmiPercent, lang, 1)}
                <span className="lr-bigstat-unit">
                  {unit === "mmol/L" ? t("mmolMol") : "%"}
                </span>
              </div>
              <div className="lr-bigstat-target">
                {unit === "mmol/L"
                  ? `${t("goal")}: ≤53 ${t("mmolMol")}`
                  : `${t("goal")}: <${formatPct(7, lang, 1)}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lr-box">
        <h3 className="lr-box-title">{t("considerationsForDoctor")}</h3>
        <div className="lr-consideration">
          <b>{t("mostImportantPattern")}</b>
          <span className="lr-consideration-chip">{pattern}</span>
        </div>
      </div>

      <div className="lr-box">
        <h3 className="lr-box-title">
          {t("glucosePatterns")} ({ctx.period.days} {t("days")})
        </h3>
        <AutoWidth>
          {(w) => (
            <PatternsScatterChart
              historic={historic}
              profile={ctx.agp}
              targets={targets}
              lang={lang}
              unit={unit}
              width={w}
            />
          )}
        </AutoWidth>
      </div>

      <div className="lr-footer-notes">
        <div>
          {t("devicesLabel")}: {ctx.data.devices.join("، ") || "—"}
        </div>
        <div>{t("considerationsFootnote")}</div>
      </div>
    </ReportPage>
  );
}
