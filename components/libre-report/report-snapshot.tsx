import type { ReactElement } from "react";
import {
  formatGlucose,
  formatNumber,
  formatPct,
  glucoseUnitLabel,
  makeT,
} from "../../lib/libre-report/i18n";
import {
  readingsInPeriod,
  scansAreStreamed,
  sensorUsageByTime,
} from "../../lib/libre-report/stats";
import { LowEventsChart, MedianChart, SensorUsageChart } from "./charts";
import {
  AppleIcon,
  LongInsulinIcon,
  RapidInsulinIcon,
  ScanIcon,
  SensorIcon,
} from "./icons";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";

export function SnapshotReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { stats, targets, lang, unit } = ctx;
  const tir = stats.timeInRanges;
  const unitLabel = glucoseUnitLabel(unit, lang);
  const usage = sensorUsageByTime(
    readingsInPeriod(ctx.data, ctx.period).filter((r) => r.historic),
    ctx.period.days,
  );
  const avgLowDuration =
    stats.lowEvents.length === 0
      ? 0
      : stats.lowEvents.reduce((a, e) => a + e.durationMin, 0) / stats.lowEvents.length;

  const comments: string[] = [];
  // "Average scans/views" reads as a behavioural count, so say when it is not
  // one — a streaming sensor can push it into the hundreds without anyone
  // having looked at the app.
  if (
    scansAreStreamed(
      readingsInPeriod(ctx.data, ctx.period).filter((r) => !r.historic),
    )
  ) {
    comments.push(
      t("streamedScansComment", {
        n: formatNumber(stats.averageScansPerDay, lang),
      }),
    );
  }
  if (stats.daysWithInsulinData < ctx.period.days) {
    comments.push(
      t("insulinGapComment", { n: ctx.period.days - stats.daysWithInsulinData }),
    );
  }
  if (stats.daysWithFoodData < ctx.period.days) {
    comments.push(t("foodGapComment", { n: ctx.period.days - stats.daysWithFoodData }));
  }

  return (
    <ReportPage ctx={ctx} title={t("snapshot")} id="snapshot">
      <div className="lr-snapshot-grid">
        <div className="lr-snapshot-main">
          <h3 className="lr-section-rule">
            {t("glucose")} <SensorIcon />{" "}
            <span className="lr-gmi-inline">
              GMI{" "}
              {stats.gmiPercent === null
                ? "—"
                : `${formatPct(stats.gmiPercent, lang, 1)} ${t("orWord")} ${formatNumber(
                    stats.gmiMmolMol!,
                    lang,
                  )} ${t("mmolMol")}`}
            </span>
          </h3>
          <div className="lr-snapshot-row">
            <div className="lr-snapshot-stats">
              <div className="lr-kpi">
                <div className="lr-kpi-label">{t("averageGlucose")}</div>
                <div className="lr-kpi-value" dir="ltr">
                  {stats.averageGlucose === null
                    ? "—"
                    : formatGlucose(stats.averageGlucose, unit, lang)}
                  <span className="lr-kpi-unit">{unitLabel}</span>
                </div>
              </div>
              <div className="lr-mini-row">
                <span>% {t("aboveTarget")}</span>
                <b>{tir ? formatNumber(tir.highPct + tir.veryHighPct, lang) : "—"} %</b>
              </div>
              <div className="lr-mini-row">
                <span>% {t("inTarget")}</span>
                <b>{tir ? formatNumber(tir.targetPct, lang) : "—"} %</b>
              </div>
              <div className="lr-mini-row">
                <span>% {t("belowTarget")}</span>
                <b>{tir ? formatNumber(tir.lowPct + tir.veryLowPct, lang) : "—"} %</b>
              </div>
            </div>
            {ctx.agp ? (
              <MedianChart profile={ctx.agp} targets={targets} lang={lang} unit={unit} />
            ) : (
              <div className="lr-empty">{t("noData")}</div>
            )}
          </div>

          <div className="lr-snapshot-row">
            <div className="lr-snapshot-stats">
              <div className="lr-kpi">
                <div className="lr-kpi-label">{t("lowGlucoseEvents")}</div>
                <div className="lr-kpi-value" dir="ltr">
                  {stats.lowEvents.length}
                </div>
              </div>
              <div className="lr-mini-row">
                <span>{t("averageDuration")}</span>
                <b>
                  {formatNumber(avgLowDuration, lang)} {t("minutes")}
                </b>
              </div>
            </div>
            <LowEventsChart events={stats.lowEvents} lang={lang} unit={unit} threshold={targets.low} />
          </div>

          <h3 className="lr-section-rule">
            {t("sensorUsage")} <ScanIcon />
          </h3>
          <div className="lr-snapshot-row">
            <div className="lr-snapshot-stats">
              <div className="lr-kpi">
                <div className="lr-kpi-label">% {t("pctTimeActive")}</div>
                <div className="lr-kpi-value" dir="ltr">
                  {stats.sensorActivePct === null
                    ? "—"
                    : formatNumber(stats.sensorActivePct, lang)}
                  <span className="lr-kpi-unit">%</span>
                </div>
              </div>
              <div className="lr-mini-row">
                <span>{t("avgScansViews")}</span>
                <b dir="ltr">
                  {formatNumber(stats.averageScansPerDay, lang)} / {t("perDay")}
                </b>
              </div>
            </div>
            <SensorUsageChart usage={usage} lang={lang} />
          </div>
        </div>

        <aside className="lr-snapshot-side">
          <h3 className="lr-section-rule">{t("carbs")}</h3>
          <div className="lr-side-item">
            <span className="lr-side-icon"><AppleIcon /></span>
            <div>
              <div className="lr-side-label">{t("dailyCarbs")}</div>
              <div className="lr-side-value">
                {stats.totalCarbsGrams === null
                  ? "—"
                  : formatNumber(stats.totalCarbsGrams / ctx.period.days, lang)}{" "}
                <span className="lr-side-unit">{t("gramsPerDay")}</span>
              </div>
            </div>
          </div>
          <h3 className="lr-section-rule">{t("insulin")}</h3>
          <div className="lr-side-item">
            <span className="lr-side-icon"><RapidInsulinIcon /></span>
            <div>
              <div className="lr-side-label">{t("rapidActingInsulin")}</div>
              <div className="lr-side-value">
                {stats.rapidInsulinPerDay === null
                  ? "—"
                  : formatNumber(stats.rapidInsulinPerDay, lang, 1)}{" "}
                <span className="lr-side-unit">{t("unitsPerDay")}</span>
              </div>
            </div>
          </div>
          <div className="lr-side-item">
            <span className="lr-side-icon"><LongInsulinIcon /></span>
            <div>
              <div className="lr-side-label">{t("longActingInsulin")}</div>
              <div className="lr-side-value">
                {stats.longInsulinPerDay === null
                  ? "—"
                  : formatNumber(stats.longInsulinPerDay, lang, 1)}{" "}
                <span className="lr-side-unit">{t("unitsPerDay")}</span>
              </div>
            </div>
          </div>
          <div className="lr-side-item">
            <div>
              <div className="lr-side-label">{t("totalDailyInsulin")}</div>
              <div className="lr-side-value">
                {stats.rapidInsulinPerDay === null && stats.longInsulinPerDay === null
                  ? "—"
                  : formatNumber(
                      (stats.rapidInsulinPerDay ?? 0) + (stats.longInsulinPerDay ?? 0),
                      lang,
                      1,
                    )}{" "}
                <span className="lr-side-unit">{t("unitsPerDay")}</span>
              </div>
            </div>
          </div>
          <h3 className="lr-section-rule">{t("comments")}</h3>
          <ul className="lr-comments">
            {comments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </aside>
      </div>
    </ReportPage>
  );
}
