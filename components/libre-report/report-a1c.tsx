import { useMemo, useState, type ReactElement } from "react";
import {
  ADAG_OFFSET,
  ADAG_OFFSET_MMOL,
  ADAG_SLOPE,
  ADAG_SLOPE_MMOL,
  cumulativeEa1c,
  dailyMeans,
  ea1cPercent,
  GMI_INTERCEPT,
  GMI_SLOPE,
  IFCC_OFFSET,
  IFCC_SLOPE,
  ngspToIfcc,
  periodTotals,
  trailingEa1c,
} from "../../lib/libre-report/a1c";
import {
  formatNumber,
  glucoseUnitLabel,
  makeT,
  MGDL_PER_MMOL,
  toGlucoseUnit,
  type ReportLang,
} from "../../lib/libre-report/i18n";
import { readingsInPeriod, startOfDay } from "../../lib/libre-report/stats";
import { AutoWidth } from "./auto-width";
import { DailyMeanBarChart, Ea1cLineChart } from "./charts";
import type { ReportContext } from "./context";
import { Select } from "./controls";
import { ReportPage } from "./report-header";

const TRAILING_CHOICES = [7, 14, 30, 90];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Localized digits with a thousands separator ("809,168" / "809 168"). */
function formatInt(value: number, lang: ReportLang): string {
  const s = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return lang === "ar" ? s.replace(/,/g, " ") : s;
}

/** A step row: leading explanation text plus an LTR formula line. */
function Step({
  index,
  text,
  formula,
}: {
  index: number;
  text: string;
  formula?: string;
}): ReactElement {
  return (
    <li className="lr-a1c-step">
      <span className="lr-a1c-step-num" aria-hidden="true">
        {index}
      </span>
      <div className="lr-a1c-step-body">
        <div>{text}</div>
        {formula ? (
          <div className="lr-eq-formula" dir="ltr">
            {formula}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function EstimatedA1cReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { data, period, targets, lang, unit } = ctx;
  const unitLabel = glucoseUnitLabel(unit, lang);
  const [trailingDays, setTrailingDays] = useState(90);

  const historic = useMemo(
    () => data.readings.filter((r) => r.historic),
    [data],
  );
  const scanCount = readingsInPeriod(data, period).filter((r) => !r.historic).length;
  const totals = useMemo(() => periodTotals(historic, period), [historic, period]);

  // full-dataset daily series (for the rolling-window trend chart)
  const datasetDaily = useMemo(() => {
    if (historic.length === 0) return [];
    const first = startOfDay(historic[0].time);
    const afterLast = startOfDay(historic[historic.length - 1].time);
    afterLast.setDate(afterLast.getDate() + 1);
    return dailyMeans(historic, first, afterLast);
  }, [historic]);

  // report-period daily series (for the bar chart and cumulative build-up)
  const periodDaily = useMemo(
    () => dailyMeans(historic, period.start, period.end),
    [historic, period],
  );
  const cumulative = useMemo(() => cumulativeEa1c(periodDaily), [periodDaily]);
  const trailing = useMemo(
    () => trailingEa1c(datasetDaily, trailingDays),
    [datasetDaily, trailingDays],
  );

  // day-index range of the report period within the full dataset
  const highlight = useMemo(() => {
    if (datasetDaily.length === 0) return undefined;
    const base = datasetDaily[0].day.getTime();
    const from = Math.round((period.start.getTime() - base) / MS_PER_DAY);
    const to = Math.round((period.end.getTime() - base) / MS_PER_DAY) - 1;
    if (to < 0 || from > datasetDaily.length - 1) return undefined;
    return {
      from: Math.max(0, from),
      to: Math.min(datasetDaily.length - 1, to),
    };
  }, [datasetDaily, period]);

  const mean = totals.n > 0 ? totals.sum / totals.n : null;
  const exact = mean === null ? null : ea1cPercent(mean);
  const rounded = exact === null ? null : Math.round(exact * 10) / 10;
  const ifcc = exact === null ? null : Math.round(ngspToIfcc(exact));

  const nf = (v: number, digits = 1) => formatNumber(v, lang, digits);
  const meanShown = mean === null ? null : nf(toGlucoseUnit(mean, unit), unit === "mmol/L" ? 2 : 1);
  // ADAG constants in the display unit, so the substitution matches the card
  const adagOffset = unit === "mmol/L" ? ADAG_OFFSET_MMOL : ADAG_OFFSET;
  const adagSlope = unit === "mmol/L" ? ADAG_SLOPE_MMOL : ADAG_SLOPE;

  return (
    <ReportPage ctx={ctx} title={t("estimatedA1c")} id="estimated-a1c">
      {/* hero value, mirroring the app screen */}
      <div className="lr-box lr-a1c-hero">
        {exact === null ? (
          <div className="lr-a1c-nodata">{t("a1cNoData")}</div>
        ) : (
          <>
            <div className="lr-a1c-hero-value" dir="ltr">
              {/* leading % in Arabic (as on the LibreLink screen), trailing in English */}
              {lang === "ar" ? <span className="lr-a1c-hero-pct">% </span> : null}
              {nf(rounded!, 1)}
              {lang === "ar" ? null : <span className="lr-a1c-hero-pct"> %</span>}
            </div>
            <div className="lr-a1c-hero-ifcc" dir="ltr">
              ({formatInt(ifcc!, lang)} {t("mmolMol")})
            </div>
            <div className="lr-a1c-hero-caption">
              {t("a1cBasedOn", { n: formatInt(totals.n, lang), d: period.days })}
            </div>
          </>
        )}
      </div>

      {/* the equations */}
      <h3 className="lr-section-rule">{t("a1cEquationsTitle")}</h3>
      <div className="lr-eq-grid">
        <div className="lr-eq-card">
          <div className="lr-eq-title">{t("a1cEqAdagTitle")}</div>
          <div className="lr-eq-formula" dir="ltr">
            eA1C % = ({t("a1cMeanShort")} + {adagOffset}) ÷ {adagSlope}
          </div>
          <p className="lr-eq-note">{t("a1cEqAdagNote")}</p>
        </div>
        <div className="lr-eq-card">
          <div className="lr-eq-title">{t("a1cEqIfccTitle")}</div>
          <div className="lr-eq-formula" dir="ltr">
            mmol/mol = {IFCC_SLOPE} × (A1C % − {IFCC_OFFSET})
          </div>
          <p className="lr-eq-note">{t("a1cEqIfccNote")}</p>
        </div>
        <div className="lr-eq-card">
          <div className="lr-eq-title">(GMI) {t("gmi")}</div>
          <div className="lr-eq-formula" dir="ltr">
            GMI % = {GMI_INTERCEPT} + {unit === "mmol/L" ? nf(GMI_SLOPE * MGDL_PER_MMOL, 4) : GMI_SLOPE} × {t("a1cMeanShort")}
          </div>
          <p className="lr-eq-note">{t("a1cEqGmiNote")}</p>
        </div>
      </div>

      {/* step-by-step with the loaded data */}
      <h3 className="lr-section-rule">{t("a1cStepsTitle")}</h3>
      {exact === null ? (
        <p className="lr-a1c-nodata">{t("a1cNoData")}</p>
      ) : (
        <ol className="lr-a1c-steps">
          <Step
            index={1}
            text={t("a1cStep1", {
              n: formatInt(totals.n, lang),
              s: formatInt(scanCount, lang),
            })}
          />
          <Step
            index={2}
            text={t("a1cStep2")}
            formula={`${t("a1cMeanShort")} = ${formatInt(toGlucoseUnit(totals.sum, unit), lang)} ÷ ${formatInt(totals.n, lang)} = ${meanShown} ${unitLabel}`}
          />
          <Step
            index={3}
            text={t("a1cStep3")}
            formula={`eA1C = (${meanShown} + ${adagOffset}) ÷ ${adagSlope} = ${nf(exact, 2)} %`}
          />
          <Step
            index={4}
            text={t("a1cStep4")}
            formula={`${nf(exact, 2)} % → ${nf(rounded!, 1)} %   |   ${IFCC_SLOPE} × (${nf(exact, 2)} − ${IFCC_OFFSET}) = ${nf(ngspToIfcc(exact), 1)} → ${formatInt(ifcc!, lang)} ${t("mmolMol")}`}
          />
        </ol>
      )}

      {/* charts */}
      {totals.n > 0 ? (
        <>
          <div className="lr-box">
            <h3 className="lr-box-title">{t("a1cChartDailyTitle")}</h3>
            <AutoWidth>
              {(w) => (
                <DailyMeanBarChart
                  daily={periodDaily}
                  targets={targets}
                  lang={lang}
                  unit={unit}
                  width={w}
                />
              )}
            </AutoWidth>
          </div>

          <div className="lr-box">
            <h3 className="lr-box-title">{t("a1cChartCumulativeTitle")}</h3>
            <p className="lr-eq-note">{t("a1cChartCumulativeNote")}</p>
            <AutoWidth>
              {(w) => <Ea1cLineChart points={cumulative} lang={lang} width={w} />}
            </AutoWidth>
          </div>

          <div className="lr-box">
            <div className="lr-a1c-trend-head">
              <h3 className="lr-box-title">{t("a1cChartTrendTitle")}</h3>
              <div className="lr-a1c-window lr-noprint">
                <span>{t("a1cTrailingWindow")}</span>
                <Select
                  value={String(trailingDays)}
                  options={TRAILING_CHOICES.map((d) => ({
                    value: String(d),
                    label: `${d} ${t("days")}`,
                  }))}
                  onChange={(v) => setTrailingDays(Number(v))}
                  ariaLabel={t("a1cTrailingWindow")}
                />
              </div>
            </div>
            <p className="lr-eq-note">{t("a1cChartTrendNote")}</p>
            <AutoWidth>
              {(w) => (
                <Ea1cLineChart
                  points={trailing}
                  lang={lang}
                  width={w}
                  highlight={highlight}
                />
              )}
            </AutoWidth>
          </div>
        </>
      ) : null}

      <div className="lr-footer-notes">
        <div>{t("gmiApprox")}</div>
      </div>
    </ReportPage>
  );
}
