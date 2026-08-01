import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatFullDate,
  glucoseUnitLabel,
  makeT,
  type GlucoseUnit,
  type LabelKey,
  type ReportLang,
} from "../../lib/libre-report/i18n";
import { parseLibreExport } from "../../lib/libre-report/parse";
import {
  computeAgpProfile,
  computeDayStats,
  computePeriodStats,
  DEFAULT_TARGETS,
  makePeriod,
  readingsInPeriod,
} from "../../lib/libre-report/stats";
import type { LibreExport } from "../../lib/libre-report/types";
import type { ReportContext } from "../../components/libre-report/context";
import { AgpReport } from "../../components/libre-report/report-agp";
import { PatternInsightsReport } from "../../components/libre-report/report-insights";
import { SnapshotReport } from "../../components/libre-report/report-snapshot";
import { DailyLogReport } from "../../components/libre-report/report-daily-log";
import { WeeklySummaryReport } from "../../components/libre-report/report-weekly";
import { MonthlySummaryReport } from "../../components/libre-report/report-monthly";
import { MealtimePatternsReport } from "../../components/libre-report/report-mealtime";
import { DailyPatternsReport } from "../../components/libre-report/report-daily-patterns";
import { DeviceDetailsReport } from "../../components/libre-report/report-device";
import { EstimatedA1cReport } from "../../components/libre-report/report-a1c";
import { SourcesReport } from "../../components/libre-report/report-sources";
import {
  filterBySource,
  shortSerial,
  summarizeSources,
} from "../../lib/libre-report/sources";
import {
  DateField,
  formatDisplayDate,
  parseDateText,
  Select,
  toIsoDate,
} from "../../components/libre-report/controls";
import "./libre-report.css";

const REPORTS: { id: string; label: LabelKey }[] = [
  { id: "agp-report", label: "agpReport" },
  { id: "pattern-insights", label: "patternInsights" },
  { id: "snapshot", label: "snapshot" },
  { id: "daily-log", label: "dailyLog" },
  { id: "weekly-summary", label: "weeklySummary" },
  { id: "monthly-summary", label: "monthlySummary" },
  { id: "mealtime-patterns", label: "mealtimePatterns" },
  { id: "daily-patterns", label: "dailyPatterns" },
  { id: "estimated-a1c", label: "estimatedA1c" },
  { id: "data-sources", label: "dataSources" },
  { id: "device-details", label: "deviceDetails" },
];

const PERIOD_CHOICES = [7, 14, 30, 90];
const DEFAULT_PERIOD_DAYS = 14;

/**
 * The DOB field is excluded by default: no toolbar picker, no header line
 * and the ?dob= URL parameter is ignored. Build with VITE_SHOW_DOB=true to
 * re-enable it.
 */
const SHOW_DOB = import.meta.env.VITE_SHOW_DOB === "true";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Whole days between two ISO dates, inclusive of both ends. */
function spanDays(startIso: string, endIso: string): number {
  const s = parseIsoLocal(startIso);
  const e = parseIsoLocal(endIso);
  if (!s || !e) return 0;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
}

export default function LibreReportPage() {
  const [lang, setLang] = useState<ReportLang>("ar");
  const [unit, setUnit] = useState<GlucoseUnit>("mg/dL");
  const [data, setData] = useState<LibreExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<string>("all");
  // ISO yyyy-mm-dd from the ?dob= query param; shown as DD/MM/YYYY on the header
  const [patientDob, setPatientDob] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [csvUrl, setCsvUrl] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  // Separate-source mode: serial the reports are narrowed to, null = merged.
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const t = makeT(lang);

  const applyData = useCallback((parsed: LibreExport) => {
    setData(parsed);
    setError(null);
    setSourceFilter(null);
    const first = parsed.readings[0]?.time;
    const last = parsed.readings.at(-1)?.time;
    if (first && last) {
      setEndDate(toIsoDate(last));
      const start = new Date(last);
      start.setDate(start.getDate() - (DEFAULT_PERIOD_DAYS - 1));
      setStartDate(toIsoDate(start < first ? first : start));
    }
  }, []);

  // first/last day with readings: the calendars never go outside these.
  // Always from the whole export — narrowing to one source must not shrink
  // the range you are allowed to ask about.
  const dataBounds = useMemo(() => {
    const first = data?.readings[0]?.time;
    const last = data?.readings.at(-1)?.time;
    return first && last ? { min: toIsoDate(first), max: toIsoDate(last) } : null;
  }, [data]);

  const sources = useMemo(() => (data ? summarizeSources(data) : []), [data]);

  // What the reports actually render: the whole export, or one source of it
  const viewData = useMemo(
    () => (data && sourceFilter ? filterBySource(data, sourceFilter) : data),
    [data, sourceFilter],
  );

  const days =
    startDate && endDate ? spanDays(startDate, endDate) : DEFAULT_PERIOD_DAYS;
  const isPresetPeriod = PERIOD_CHOICES.includes(days);

  useEffect(() => {
    document.title = lang === "ar" ? "تقارير الجلوكوز" : "Glucose Reports";
  }, [lang]);

  const onUpload = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        setFileName(file.name);
        applyData(parseLibreExport(await file.text()));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [applyData],
  );

  const loadFromUrl = useCallback(
    async (url: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        applyData(parseLibreExport(await res.text()));
        const name = url.split("/").pop()?.split("?")[0];
        setFileName(name ? decodeURIComponent(name) : url);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        setError(`${makeT(lang)("fetchCsvError")}: ${detail}`);
      } finally {
        setLoading(false);
      }
    },
    [applyData, lang],
  );

  // ?csv=<url> loads that export on startup; with the DOB flag enabled,
  // ?dob=DD/MM/YYYY prefills the header
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("csv");
    if (src) void loadFromUrl(src);
    if (SHOW_DOB) {
      const dob = params.get("dob");
      if (dob) {
        const iso = parseDateText(dob);
        if (iso) setPatientDob(iso);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // drag & drop a CSV anywhere on the page
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      e.dataTransfer?.types.includes("Files") ?? false;
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) void onUpload(f);
    };
    document.addEventListener("dragenter", onEnter);
    document.addEventListener("dragover", onOver);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onEnter);
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("dragleave", onLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [onUpload]);

  const ctx: ReportContext | null = useMemo(() => {
    if (!data || !viewData || !startDate || !endDate) return null;
    const [y, m, d] = endDate.split("-").map(Number);
    const period = makePeriod(new Date(y, m - 1, d), spanDays(startDate, endDate));
    const stats = computePeriodStats(viewData, period, DEFAULT_TARGETS);
    const historic = readingsInPeriod(viewData, period).filter((r) => r.historic);
    return {
      data: viewData,
      fullData: data,
      activeSource: sourceFilter,
      onSelectSource: setSourceFilter,
      period,
      stats,
      days: computeDayStats(viewData, period, DEFAULT_TARGETS),
      agp: computeAgpProfile(historic),
      targets: DEFAULT_TARGETS,
      lang,
      unit,
      patientName: data.generatedBy,
      patientDob: SHOW_DOB ? formatDisplayDate(patientDob) || "—" : "",
      generatedAt: formatFullDate(new Date(), lang),
    };
  }, [data, viewData, sourceFilter, startDate, endDate, lang, unit, patientDob]);

  const show = (id: string) => selectedReport === "all" || selectedReport === id;

  return (
    <div className="lr-root" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      {/* Toolbar: identity + actions on top, report controls below. The
          controls only mean anything once an export is loaded, so before
          that the row is not rendered at all. */}
      <div className="lr-toolbar lr-noprint">
        <div className="lr-toolbar-head">
          <div className="lr-toolbar-brand">{t("appTitle")}</div>
          <div className="lr-toolbar-actions">
            {data ? (
              <button
                type="button"
                className="lr-btn lr-btn-primary"
                onClick={() => window.print()}
              >
                {t("printReport")}
              </button>
            ) : null}
            <button
              type="button"
              className="lr-btn"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              {lang === "ar" ? "English" : "العربية"}
            </button>
          </div>
        </div>
        {data ? (
        <div className="lr-toolbar-controls">
        <div className="lr-tool">
          <span>{t("reportPeriod")}</span>
          <Select
            value={isPresetPeriod ? String(days) : "custom"}
            options={[
              ...PERIOD_CHOICES.map((d) => ({
                value: String(d),
                label: `${d} ${t("days")}`,
              })),
              ...(isPresetPeriod
                ? []
                : [{ value: "custom", label: t("customPeriod") }]),
            ]}
            onChange={(v) => {
              if (v === "custom" || !endDate) return;
              const end = parseIsoLocal(endDate);
              if (!end) return;
              end.setDate(end.getDate() - (Number(v) - 1));
              setStartDate(toIsoDate(end));
            }}
            ariaLabel={t("reportPeriod")}
          />
        </div>
        <div className="lr-tool">
          <span>{t("unit")}</span>
          <Select
            value={unit}
            options={(["mg/dL", "mmol/L"] as GlucoseUnit[]).map((u) => ({
              value: u,
              label: glucoseUnitLabel(u, lang),
            }))}
            onChange={(v) => setUnit(v as GlucoseUnit)}
            ariaLabel={t("unit")}
          />
        </div>
        <div className="lr-tool">
          <span>{t("startDate")}</span>
          <DateField
            value={startDate}
            onChange={(iso) => {
              setStartDate(iso);
              if (endDate && iso > endDate) setEndDate(iso);
            }}
            lang={lang}
            ariaLabel={t("startDate")}
            min={dataBounds?.min}
            max={dataBounds?.max}
          />
        </div>
        <div className="lr-tool">
          <span>{t("endDate")}</span>
          <DateField
            value={endDate}
            onChange={(iso) => {
              setEndDate(iso);
              if (startDate && iso < startDate) setStartDate(iso);
            }}
            lang={lang}
            ariaLabel={t("endDate")}
            min={dataBounds?.min}
            max={dataBounds?.max}
          />
        </div>
        {SHOW_DOB ? (
          <div className="lr-tool">
            <span>{t("dob")}</span>
            <DateField
              value={patientDob}
              onChange={setPatientDob}
              lang={lang}
              ariaLabel={t("dob")}
              clearable
            />
          </div>
        ) : null}
        {sources.length > 1 ? (
          <div className="lr-tool lr-tool-wide">
            <span>{t("source")}</span>
            <Select
              value={sourceFilter ?? "all"}
              options={[
                { value: "all", label: t("allSources") },
                ...sources.map((s) => ({ value: s.serial, label: s.short })),
              ]}
              onChange={(v) => setSourceFilter(v === "all" ? null : v)}
              ariaLabel={t("source")}
            />
          </div>
        ) : null}
        <div className="lr-tool lr-tool-wide lr-upload">
          <span>{t("uploadCsv")}</span>
          <label className="lr-field-btn lr-file-btn" title={fileName || undefined}>
            <span className="lr-file-name">
              {fileName || (lang === "ar" ? "اختيار ملف…" : "Choose file…")}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </label>
        </div>
        </div>
        ) : null}
      </div>

      {ctx && sourceFilter ? (
        <div className="lr-src-banner">
          <span>{t("srcFilterBanner", { s: shortSerial(sourceFilter) })}</span>
          <button
            type="button"
            className="lr-btn lr-noprint"
            onClick={() => setSourceFilter(null)}
          >
            {t("srcShowAll")}
          </button>
        </div>
      ) : null}

      {error ? <div className="lr-error">{error}</div> : null}
      {loading ? <div className="lr-loading">…</div> : null}

      {dragOver ? (
        <div className="lr-drop-overlay lr-noprint" aria-hidden="true">
          <div className="lr-drop-card">{t("dropCsvHere")}</div>
        </div>
      ) : null}

      {!ctx && !loading ? (
        <main className="lr-empty" role="status">
          <div className="lr-empty-card">
            <div className="lr-empty-mark" aria-hidden="true">↥</div>
            <h1>{lang === "ar" ? "أنشئ تقرير الجلوكوز" : "Create a glucose report"}</h1>
            <p>
              {lang === "ar"
                ? "حمّل ملف CSV المُصدّر من LibreView لإنشاء جميع الرسوم والملخصات محلياً في متصفحك."
                : "Upload a LibreView CSV export to generate every chart and summary locally in your browser."}
            </p>
            <label className="lr-empty-upload">
              {lang === "ar" ? "اختيار ملف CSV" : "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>
            <div className="lr-empty-or">{t("orWord")}</div>
            <form
              className="lr-url-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (csvUrl.trim()) void loadFromUrl(csvUrl.trim());
              }}
            >
              <input
                type="url"
                dir="ltr"
                placeholder="https://…/glucose.csv"
                aria-label={t("loadFromUrl")}
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
              />
              <button type="submit" className="lr-btn lr-btn-primary">
                {t("load")}
              </button>
            </form>
            <p className="lr-empty-drophint">{t("dropCsvHint")}</p>
            <small>
              {lang === "ar"
                ? "لا يتم رفع بياناتك إلى أي خادم."
                : "Your health data is never uploaded to a server."}
            </small>
          </div>
        </main>
      ) : null}

      {ctx ? (
        <nav className="lr-tabs lr-noprint" aria-label={t("allReports")}>
          {[{ id: "all", label: "allReports" as LabelKey }, ...REPORTS].map((r) => (
            <button
              key={r.id}
              type="button"
              className={"lr-tab" + (selectedReport === r.id ? " lr-tab-active" : "")}
              aria-current={selectedReport === r.id ? "true" : undefined}
              onClick={() => setSelectedReport(r.id)}
            >
              {t(r.label)}
            </button>
          ))}
        </nav>
      ) : null}

      {ctx ? (
        <main className="lr-reports">
          {show("agp-report") ? <AgpReport ctx={ctx} /> : null}
          {show("pattern-insights") ? <PatternInsightsReport ctx={ctx} /> : null}
          {show("snapshot") ? <SnapshotReport ctx={ctx} /> : null}
          {show("daily-log") ? <DailyLogReport ctx={ctx} /> : null}
          {show("weekly-summary") ? <WeeklySummaryReport ctx={ctx} /> : null}
          {show("monthly-summary") ? <MonthlySummaryReport ctx={ctx} /> : null}
          {show("mealtime-patterns") ? <MealtimePatternsReport ctx={ctx} /> : null}
          {show("daily-patterns") ? <DailyPatternsReport ctx={ctx} /> : null}
          {show("estimated-a1c") ? <EstimatedA1cReport ctx={ctx} /> : null}
          {show("data-sources") ? <SourcesReport ctx={ctx} /> : null}
          {show("device-details") ? <DeviceDetailsReport ctx={ctx} /> : null}
        </main>
      ) : null}
    </div>
  );
}
