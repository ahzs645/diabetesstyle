import type { ReactElement } from "react";
import {
  formatDurationOfDay,
  formatGlucose,
  formatNumber,
  formatPct,
  formatPeriod,
  glucoseUnitLabel,
  makeT,
  weekdayName,
} from "../../lib/libre-report/i18n";
import { AutoWidth } from "./auto-width";
import { AgpChart, DailyProfileThumb, TimeInRangesBar } from "./charts";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";

export function AgpReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { stats, targets, lang, unit } = ctx;
  const tir = stats.timeInRanges;
  const unitLabel = glucoseUnitLabel(unit, lang);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);

  return (
    <ReportPage ctx={ctx} title={t("agpReport")} id="agp-report">
      <div className="lr-columns">
        <div className="lr-col lr-col-wide">
          <h3 className="lr-band-title">{t("glucoseStatsAndTargets")}</h3>
          <div className="lr-stats-block">
            <div className="lr-stat-row">
              <b>
                {formatPeriod(ctx.period.start, ctx.period.end, ctx.period.days, lang)}
              </b>
            </div>
            <div className="lr-stat-row">
              <span>{t("timeSensorActive")}</span>
              <b>
                {stats.sensorActivePct === null
                  ? "—"
                  : formatPct(stats.sensorActivePct, lang)}
              </b>
            </div>
            <table className="lr-targets-table">
              <thead>
                <tr>
                  <th colSpan={2} className="lr-targets-caption">
                    {t("rangesTargetsFor")} <span>{t("diabetesType")}</span>
                  </th>
                </tr>
                <tr>
                  <th>{t("glucoseRanges")}</th>
                  <th>{t("targetsPctReadings")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {t("targetRangeLabel")}{" "}
                    <span dir="ltr">
                      {g(targets.low)}-{g(targets.high)} {unitLabel}
                    </span>
                  </td>
                  <td>
                    {t("greaterThan")} {formatPct(70, lang)} ({formatDurationOfDay(70, lang)})
                  </td>
                </tr>
                <tr>
                  <td>{t("belowThreshold", { v: g(targets.low), u: unitLabel })}</td>
                  <td>
                    {t("lessThan")} {formatPct(4, lang)} ({formatDurationOfDay(4, lang)})
                  </td>
                </tr>
                <tr>
                  <td>{t("belowThreshold", { v: g(targets.veryLow), u: unitLabel })}</td>
                  <td>
                    {t("lessThan")} {formatPct(1, lang)} ({formatDurationOfDay(1, lang)})
                  </td>
                </tr>
                <tr>
                  <td>{t("aboveThreshold", { v: g(targets.high), u: unitLabel })}</td>
                  <td>
                    {t("lessThan")} {formatPct(25, lang)} ({formatDurationOfDay(25, lang)})
                  </td>
                </tr>
                <tr>
                  <td>{t("aboveThreshold", { v: g(targets.veryHigh), u: unitLabel })}</td>
                  <td>
                    {t("lessThan")} {formatPct(5, lang)} ({formatDurationOfDay(5, lang)})
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="lr-footnote">
              {t("tirBenefit", { lo: g(targets.low), hi: g(targets.high), u: unitLabel })}
            </div>
            <div className="lr-stat-row lr-stat-strong">
              <span>{t("averageGlucose")}</span>
              <b>
                {stats.averageGlucose === null
                  ? "—"
                  : `${g(stats.averageGlucose)} ${unitLabel}`}
              </b>
            </div>
            <div className="lr-stat-row lr-stat-strong">
              <span>{t("gmi")}</span>
              <b>
                {stats.gmiPercent === null
                  ? "—"
                  : `${formatPct(stats.gmiPercent, lang, 1)} ${t("orWord")} ${formatNumber(
                      Math.round(stats.gmiMmolMol!),
                      lang,
                    )} ${t("mmolMol")}`}
              </b>
            </div>
            <div className="lr-stat-row lr-stat-strong">
              <span>{t("glucoseVariability")}</span>
              <b>{stats.cvPct === null ? "—" : formatPct(stats.cvPct, lang, 1)}</b>
            </div>
            <div className="lr-footnote">{t("cvDefinition")}</div>
          </div>
        </div>
        <div className="lr-col">
          <h3 className="lr-band-title">{t("timeInRanges")}</h3>
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
            />
          ) : (
            <div className="lr-empty">{t("noData")}</div>
          )}
        </div>
      </div>

      <h3 className="lr-band-title">{t("agpSectionTitle")}</h3>
      <p className="lr-explainer">{t("agpExplainer")}</p>
      {ctx.agp ? (
        <AutoWidth>
          {(w) => <AgpChart profile={ctx.agp!} targets={targets} lang={lang} unit={unit} width={w} />}
        </AutoWidth>
      ) : (
        <div className="lr-empty">{t("noData")}</div>
      )}

      <h3 className="lr-band-title">{t("dailyGlucoseProfiles")}</h3>
      <p className="lr-explainer">{t("dailyProfilesExplainer")}</p>
      <DailyProfilesGrid ctx={ctx} />
    </ReportPage>
  );
}

/** 7-column daily thumbnails aligned to weekdays, like the printed AGP. */
export function DailyProfilesGrid({ ctx }: { ctx: ReportContext }): ReactElement {
  const { days, targets, lang, unit } = ctx;
  // Pad the first row so each column matches its weekday (week starts Sunday).
  const lead = days.length ? days[0].day.getDay() : 0;
  const cells: (typeof days[number] | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <div className="lr-daily-profiles">
      <div className="lr-week-row lr-week-head">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="lr-week-cell lr-week-day-name">
            {weekdayName(i, lang)}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="lr-week-row">
          {row.map((day, ci) =>
            day ? (
              <div key={ci} className="lr-week-cell">
                <DailyProfileThumb
                  historic={day.historic}
                  targets={targets}
                  dayNumber={day.day.getDate()}
                  lang={lang}
                  unit={unit}
                  showYLabels={ci === 0 && ri === 0}
                />
              </div>
            ) : (
              <div key={ci} className="lr-week-cell lr-week-cell-empty" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
