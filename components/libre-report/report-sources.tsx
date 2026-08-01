import { useMemo, useState, type ReactElement } from "react";
import {
  formatFullDate,
  formatNumber,
  formatPct,
  formatPeriod,
  glucoseUnitLabel,
  makeT,
  toGlucoseUnit,
} from "../../lib/libre-report/i18n";
import {
  datasetBounds,
  LOW_COVERAGE_PCT,
  mergedWindow,
  reconstructScreen,
  sourceDayMask,
  sourceWindow,
  summarizeSources,
  type SourceWindow,
} from "../../lib/libre-report/sources";
import { AutoWidth } from "./auto-width";
import { SourceTimelineChart, type SourceTimelineRow } from "./charts";
import type { ReportContext } from "./context";
import { DateField, toIsoDate } from "./controls";
import { ReportPage } from "./report-header";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO "yyyy-mm-dd" -> local Date, or null. */
function parseIsoLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * Data Sources report: which app instance recorded what, and what each one
 * alone would have shown for the selected period.
 *
 * Always computed from `ctx.fullData` — narrowing the reports to one source
 * must not hide the sources being compared.
 */
export function SourcesReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { fullData, period, lang, unit, activeSource, onSelectSource } = ctx;
  const unitLabel = glucoseUnitLabel(unit, lang);

  // Per-instance "as of" day for the screen reconstruction below. A screen is
  // pinned by TWO things — which instance, and the day it was opened — and
  // the day is not derivable, so it stays editable. Defaults to the last day
  // that instance recorded anything.
  const [asOf, setAsOf] = useState<Record<string, string>>({});

  const sources = useMemo(() => summarizeSources(fullData), [fullData]);
  const merged = useMemo(() => mergedWindow(fullData, period), [fullData, period]);
  const windows = useMemo(
    () => sources.map((s) => sourceWindow(fullData, s.serial, period)),
    [fullData, sources, period],
  );

  const bounds = useMemo(() => datasetBounds(fullData), [fullData]);
  // the reconstruction calendars never go outside the data that exists
  const dataMaxIso = useMemo(() => {
    const last = fullData.readings.at(-1)?.time;
    return last ? toIsoDate(last) : undefined;
  }, [fullData]);
  const timeline: SourceTimelineRow[] = useMemo(() => {
    if (!bounds) return [];
    return sources.map((s) => ({
      label: s.short,
      days: sourceDayMask(fullData, s.serial, bounds.start, bounds.dayCount),
    }));
  }, [fullData, sources, bounds]);

  const highlight = useMemo(() => {
    if (!bounds) return undefined;
    const base = bounds.start.getTime();
    const from = Math.round((period.start.getTime() - base) / MS_PER_DAY);
    const to = Math.round((period.end.getTime() - base) / MS_PER_DAY) - 1;
    if (to < 0 || from > bounds.dayCount - 1) return undefined;
    return { from: Math.max(0, from), to: Math.min(bounds.dayCount - 1, to) };
  }, [bounds, period]);

  const nf = (v: number, digits = 1) => formatNumber(v, lang, digits);
  const meanText = (w: SourceWindow) =>
    w.meanMgdl === null
      ? "—"
      : `${nf(toGlucoseUnit(w.meanMgdl, unit), unit === "mmol/L" ? 2 : 1)} ${unitLabel}`;
  const a1cText = (w: SourceWindow) =>
    w.ea1cPercent === null
      ? "—"
      : `${formatPct(Math.round(w.ea1cPercent * 10) / 10, lang, 1)} (${Math.round(w.ifccMmolMol!)})`;
  const spanText = (w: SourceWindow) =>
    w.first && w.last
      ? `${formatFullDate(w.first, lang)} – ${formatFullDate(w.last, lang)}`
      : "—";

  // consecutive sources whose spans meet inside the dataset: the moment the
  // user's history stopped following them onto the next instance
  const handovers = sources.slice(1).map((next, i) => ({
    prev: sources[i],
    next,
  }));

  const lowCoverage = windows.filter(
    (w) => w.n > 0 && w.dayCoveragePct < LOW_COVERAGE_PCT,
  );

  const row = (w: SourceWindow, label: string, isMerged: boolean) => {
    const isActive = !isMerged && w.serial === activeSource;
    const delta =
      isMerged || w.ea1cPercent === null || merged.ea1cPercent === null
        ? null
        : w.ea1cPercent - merged.ea1cPercent;
    return (
      <tr
        key={w.serial ?? "merged"}
        className={
          (isMerged ? "lr-src-row-merged" : "") + (isActive ? " lr-src-row-active" : "")
        }
      >
        <th scope="row">
          {/* serials are monospaced so instances line up; the merged row's
              label is prose and must keep the Arabic font's shaping */}
          <span className={isMerged ? undefined : "lr-src-name"} dir={isMerged ? undefined : "ltr"}>
            {label}
          </span>
          {onSelectSource && !isMerged ? (
            <button
              type="button"
              className="lr-src-pick lr-noprint"
              onClick={() => onSelectSource(isActive ? null : w.serial)}
            >
              {isActive ? t("srcShowAll") : t("srcShowOnly")}
            </button>
          ) : null}
        </th>
        {/* dir goes on the inline run, not the cell: putting it on the <td>
            would flip `text-align: start` and break column alignment.
            data-label feeds the stacked card layout used on phones. */}
        <td data-label={t("srcColSpan")}>
          <span dir="ltr">{spanText(w)}</span>
        </td>
        <td data-label={t("srcColDays")}>
          <span dir="ltr">
            {w.daysWithData} / {w.daysClaimed}
          </span>
        </td>
        <td data-label={t("srcColReadings")}>{formatNumber(w.n, lang)}</td>
        <td data-label={t("averageGlucose")}>
          <span dir="ltr">{meanText(w)}</span>
        </td>
        <td className="lr-src-a1c" data-label={t("estimatedA1c")}>
          <span dir="ltr">{a1cText(w)}</span>
          {delta !== null && Math.abs(delta) >= 0.05 ? (
            <span className="lr-src-delta">
              {delta > 0 ? "+" : "−"}
              {nf(Math.abs(delta), 2)} {t("srcVsMerged")}
            </span>
          ) : null}
        </td>
        <td data-label={t("srcColCoverage")}>
          <span
            className={
              "lr-src-cov" +
              (!isMerged && w.n > 0 && w.dayCoveragePct < LOW_COVERAGE_PCT
                ? " lr-src-cov-low"
                : "")
            }
          >
            {formatPct(w.readingCoveragePct, lang, 0)}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <ReportPage ctx={ctx} title={t("dataSources")} id="data-sources">
      <p className="lr-src-explainer">{t("srcExplainer")}</p>

      {sources.length < 2 ? (
        <p className="lr-src-single">{t("srcSingle")}</p>
      ) : null}

      {bounds && timeline.length > 0 ? (
        <div className="lr-box">
          <h3 className="lr-box-title">{t("srcTimelineTitle")}</h3>
          <p className="lr-eq-note">{t("srcTimelineNote")}</p>
          <AutoWidth>
            {(w) => (
              <SourceTimelineChart
                rows={timeline}
                startDay={bounds.start}
                lang={lang}
                width={w}
                highlight={highlight}
              />
            )}
          </AutoWidth>
        </div>
      ) : null}

      <div className="lr-box">
        <h3 className="lr-box-title">{t("srcTableTitle")}</h3>
        <p className="lr-eq-note">{t("srcTableNote")}</p>
        <div className="lr-hscroll">
          <table className="lr-src-table">
            <thead>
              <tr>
                <th scope="col">{t("source")}</th>
                <th scope="col">{t("srcColSpan")}</th>
                <th scope="col">{t("srcColDays")}</th>
                <th scope="col">{t("srcColReadings")}</th>
                <th scope="col">{t("averageGlucose")}</th>
                <th scope="col">{t("estimatedA1c")}</th>
                <th scope="col">{t("srcColCoverage")}</th>
              </tr>
            </thead>
            <tbody>
              {row(merged, t("srcMergedLabel"), true)}
              {windows.map((w, i) => row(w, sources[i].short, false))}
            </tbody>
          </table>
        </div>
        {windows.every((w) => w.n === 0) ? (
          <p className="lr-eq-note">{t("srcNoReadings")}</p>
        ) : null}
      </div>

      {/* The payoff: each instance's own Estimated A1C screen, on a day you
          choose. Rebuilding an observed screenshot means matching both the
          instance and the day it was opened. */}
      <div className="lr-box">
        <h3 className="lr-box-title">{t("reconTitle")}</h3>
        <p className="lr-eq-note">{t("reconNote", { n: period.days })}</p>
        <table className="lr-src-table lr-recon-table">
          <thead>
            <tr>
              <th scope="col">{t("reconColInstance")}</th>
              <th scope="col">{t("reconColHeading")}</th>
              <th scope="col">{t("reconColDays")}</th>
              <th scope="col">{t("reconColShows")}</th>
              <th scope="col">{t("reconColMerged")}</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const iso = asOf[s.serial] ?? toIsoDate(s.last);
              const day = parseIsoLocal(iso) ?? s.last;
              const scr = reconstructScreen(fullData, s.serial, day, period.days);
              return (
                <tr key={s.serial}>
                  <th scope="row">
                    <span className="lr-src-name" dir="ltr">
                      {s.short}
                    </span>
                    <span className="lr-recon-since">
                      {t("reconSince", { d: formatFullDate(s.first, lang) })}
                    </span>
                  </th>
                  <td className="lr-recon-headcell" data-label={t("reconColHeading")}>
                    <span className="lr-recon-window">
                      {formatPeriod(
                        scr.period.start,
                        scr.period.end,
                        scr.period.days,
                        lang,
                      )}
                    </span>
                    <span className="lr-recon-date lr-noprint">
                      <DateField
                        value={iso}
                        onChange={(v) =>
                          setAsOf((prev) => ({ ...prev, [s.serial]: v }))
                        }
                        lang={lang}
                        ariaLabel={`${t("reconColHeading")} — ${s.short}`}
                        min={bounds ? toIsoDate(bounds.start) : undefined}
                        max={dataMaxIso}
                      />
                    </span>
                  </td>
                  <td data-label={t("reconColDays")}>
                    <span
                      className={
                        scr.source.dayCoveragePct < LOW_COVERAGE_PCT
                          ? "lr-src-cov-low"
                          : undefined
                      }
                    >
                      {t("reconDaysOf", {
                        d: scr.source.daysWithData,
                        t: scr.source.daysClaimed,
                      })}
                    </span>
                  </td>
                  <td className="lr-src-a1c" data-label={t("reconColShows")}>
                    <span dir="ltr">{a1cText(scr.source)}</span>
                  </td>
                  <td data-label={t("reconColMerged")}>
                    <span dir="ltr">{a1cText(scr.merged)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lowCoverage.length > 0 ? (
        <div className="lr-box lr-src-warnbox">
          <h3 className="lr-box-title">{t("srcLowCoverage")}</h3>
          <ul className="lr-src-warnlist">
            {lowCoverage.map((w) => (
              <li key={w.serial}>
                <b dir="ltr">{w.short}</b>{" "}
                {t("srcLowCoverageNote", {
                  d: w.daysWithData,
                  t: w.daysClaimed,
                  p: formatPct(w.readingCoveragePct, lang, 0),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {handovers.length > 0 ? (
        <div className="lr-box">
          <h3 className="lr-box-title">{t("srcHandoverTitle")}</h3>
          <ul className="lr-src-warnlist">
            {handovers.map(({ prev, next }) => (
              <li key={next.serial}>
                {t("srcHandoverNote", {
                  a: prev.short,
                  da: formatFullDate(prev.last, lang),
                  b: next.short,
                  db: formatFullDate(next.first, lang),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ReportPage>
  );
}
