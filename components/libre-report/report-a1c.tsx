import { useEffect, useMemo, useState, type ReactElement } from "react";
import { flushSync } from "react-dom";
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
  gmiPercent,
  IFCC_OFFSET,
  IFCC_SLOPE,
  ngspToIfcc,
  periodTotals,
  trailingEa1c,
} from "../../lib/libre-report/a1c";
import {
  formatNumber,
  formatPct,
  glucoseUnitLabel,
  makeT,
  MGDL_PER_MMOL,
  toGlucoseUnit,
  type ReportLang,
} from "../../lib/libre-report/i18n";
import {
  LOW_COVERAGE_PCT,
  mergedWindow,
  READINGS_PER_DAY,
  sourceWindows,
} from "../../lib/libre-report/sources";
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

/**
 * The published source behind an equation. Author/journal strings stay Latin
 * in both languages — a transliterated citation cannot be looked up.
 */
function Cite({ href, children }: { href: string; children: string }): ReactElement {
  return (
    <p className="lr-eq-cite" dir="ltr">
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    </p>
  );
}

const REF_ADAG = "https://doi.org/10.2337/dc08-0545";
const REF_IFCC = "https://ngsp.org/ifccngsp.asp";
const REF_GMI = "https://doi.org/10.2337/dc18-1581";
const REF_PERLMAN = "https://doi.org/10.1089/dia.2020.0501";

/** Full references, in the order the equations appear above them. */
const REFERENCES: { href: string; text: string; scope: "a1cRefAdagScope" | "a1cRefIfccScope" | "a1cRefGmiScope" | "a1cRefPerlmanScope" }[] = [
  {
    href: REF_ADAG,
    text: "Nathan DM, Kuenen J, Borg R, Zheng H, Schoenfeld D, Heine RJ; A1c-Derived Average Glucose (ADAG) Study Group. Translating the A1C Assay Into Estimated Average Glucose Values. Diabetes Care 2008;31(8):1473–1478.",
    scope: "a1cRefAdagScope",
  },
  {
    href: REF_IFCC,
    text: "NGSP. HbA1c methods — the IFCC/NGSP master equation: NGSP = 0.09148 × IFCC + 2.152.",
    scope: "a1cRefIfccScope",
  },
  {
    href: REF_GMI,
    text: "Bergenstal RM, Beck RW, Close KL, et al. Glucose Management Indicator (GMI): A New Term for Estimating A1C From Continuous Glucose Monitoring. Diabetes Care 2018;41(11):2275–2280.",
    scope: "a1cRefGmiScope",
  },
  {
    href: REF_PERLMAN,
    text: "Perlman JE, Gooley TA, McNulty B, Meyers J, Hirsch IB. HbA1c and Glucose Management Indicator Discordance: A Real-World Analysis. Diabetes Technol Ther 2021;23(4):253–258.",
    scope: "a1cRefPerlmanScope",
  },
];

export function EstimatedA1cReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { data, period, targets, lang, unit } = ctx;
  const unitLabel = glucoseUnitLabel(unit, lang);
  const [trailingDays, setTrailingDays] = useState(90);
  // The equations/math live in a collapsed section so readers who only want
  // the value and charts are not confronted with formulas.
  const [mathOpen, setMathOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // expand the math while printing so the printed report is complete
  useEffect(() => {
    // beforeprint fires synchronously ahead of print layout, so the state
    // change must be flushed to the DOM inside the handler itself.
    const onBefore = () => flushSync(() => setPrinting(true));
    const onAfter = () => setPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);
  const showMath = mathOpen || printing;

  const historic = useMemo(
    () => data.readings.filter((r) => r.historic),
    [data],
  );
  const scanCount = readingsInPeriod(data, period).filter((r) => !r.historic).length;
  const totals = useMemo(() => periodTotals(historic, period), [historic, period]);
  // How much of the claimed window actually carries readings. A mean over a
  // thin slice still renders as a confident number, so say when it is one.
  const coverage = useMemo(() => mergedWindow(data, period), [data, period]);

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

  // Which app instances the window is actually built from. A merged window
  // spanning a phone handover is a splice no single phone screen ever showed.
  const periodSources = useMemo(
    () => sourceWindows(data, period).filter((s) => s.n > 0),
    [data, period],
  );

  const mean = totals.n > 0 ? totals.sum / totals.n : null;
  const exact = mean === null ? null : ea1cPercent(mean);
  const rounded = exact === null ? null : Math.round(exact * 10) / 10;
  const ifcc = exact === null ? null : Math.round(ngspToIfcc(exact));
  // GMI on the same mean. The equation card used to print the formula and
  // never the result, which hid the one comparison that matters here.
  const gmi = mean === null ? null : gmiPercent(mean);

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
            {coverage.dayCoveragePct < LOW_COVERAGE_PCT ? (
              <div className="lr-a1c-coverage">
                {t("a1cCoverageWarn", {
                  p: formatPct(coverage.readingCoveragePct, lang, 0),
                  d: coverage.daysWithData,
                  t: coverage.daysClaimed,
                })}
              </div>
            ) : null}
          </>
        )}
      </div>

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

      {/* the math, tucked away at the end for readers who want it */}
      <section className="lr-a1c-math">
        <button
          type="button"
          className="lr-a1c-math-toggle"
          aria-expanded={showMath}
          onClick={() => setMathOpen((open) => !open)}
        >
          <span className={"lr-a1c-math-chev" + (showMath ? " lr-a1c-math-chev-open" : "")} aria-hidden="true" />
          {t("a1cMathTitle")}
        </button>
        {showMath ? (
          <div className="lr-a1c-math-body">
            <h3 className="lr-section-rule">{t("a1cEquationsTitle")}</h3>
            <div className="lr-eq-grid">
              <div className="lr-eq-card">
                <div className="lr-eq-title">{t("a1cEqAdagTitle")}</div>
                <div className="lr-eq-formula" dir="ltr">
                  eA1C % = ({t("a1cMeanShort")} + {adagOffset}) ÷ {adagSlope}
                </div>
                <p className="lr-eq-note">{t("a1cEqAdagNote")}</p>
                <Cite href={REF_ADAG}>Nathan et al., Diabetes Care 2008;31:1473–1478</Cite>
              </div>
              <div className="lr-eq-card">
                <div className="lr-eq-title">{t("a1cEqIfccTitle")}</div>
                <div className="lr-eq-formula" dir="ltr">
                  mmol/mol = {IFCC_SLOPE} × (A1C % − {IFCC_OFFSET})
                </div>
                <p className="lr-eq-note">{t("a1cEqIfccNote")}</p>
                <Cite href={REF_IFCC}>NGSP–IFCC master equation (ngsp.org)</Cite>
              </div>
              <div className="lr-eq-card">
                <div className="lr-eq-title">(GMI) {t("gmi")}</div>
                <div className="lr-eq-formula" dir="ltr">
                  GMI % = {GMI_INTERCEPT} + {unit === "mmol/L" ? nf(GMI_SLOPE * MGDL_PER_MMOL, 4) : GMI_SLOPE} × {t("a1cMeanShort")}
                </div>
                {gmi === null ? null : (
                  <div className="lr-eq-result" dir="ltr">
                    {t("a1cResultWord")}: {nf(gmi, 1)} %
                  </div>
                )}
                <p className="lr-eq-note">{t("a1cEqGmiNote")}</p>
                <Cite href={REF_GMI}>Bergenstal et al., Diabetes Care 2018;41:2275–2280</Cite>
              </div>
            </div>

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

            <h3 className="lr-section-rule">{t("a1cTrustTitle")}</h3>
            <ul className="lr-a1c-caveats">
              <li>{t("a1cTrustWindow", { d: period.days })}</li>
              {exact === null ? null : (
                <li>
                  {t("a1cTrustCoverage", {
                    n: formatInt(totals.n, lang),
                    e: formatInt(period.days * READINGS_PER_DAY, lang),
                    d: period.days,
                    p: formatPct(coverage.readingCoveragePct, lang, 0),
                  })}
                </li>
              )}
              <li>{t("a1cTrustSpread")}</li>
              {exact === null || gmi === null ? null : (
                <li>
                  {t("a1cTrustGmi", {
                    a: formatPct(exact, lang, 1),
                    g: formatPct(gmi, lang, 1),
                    dpp: nf(Math.abs(gmi - exact), 2),
                  })}
                </li>
              )}
              <li>{t("a1cTrustPhysiology")}</li>
              {periodSources.length > 1 ? (
                <li>
                  {t("a1cTrustSources", {
                    k: periodSources.length,
                    // each entry is a Latin/numeric run inside a sentence
                    // that may be RTL — isolate it so bidi cannot reorder
                    // the serial, the day count and the value into nonsense
                    list: periodSources
                      .map(
                        (s) =>
                          `\u2066${s.short} ${s.daysWithData}/${period.days} → ${formatPct(s.ea1cPercent!, lang, 1)}\u2069`,
                      )
                      .join(" · "),
                  })}
                </li>
              ) : null}
            </ul>

            <h3 className="lr-section-rule">{t("a1cRefsTitle")}</h3>
            <ol className="lr-a1c-refs">
              {REFERENCES.map((ref) => (
                <li key={ref.href}>
                  <a
                    className="lr-a1c-ref-link"
                    dir="ltr"
                    href={ref.href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {ref.text}
                  </a>
                  <span className="lr-a1c-ref-scope">{t(ref.scope)}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <div className="lr-footer-notes">
        <div>{t("gmiApprox")}</div>
      </div>
    </ReportPage>
  );
}
