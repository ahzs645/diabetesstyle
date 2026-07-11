import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatFullDate,
  makeT,
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
import {
  DateField,
  formatDisplayDate,
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
  { id: "device-details", label: "deviceDetails" },
];

const PERIOD_CHOICES = [7, 14, 30, 90];

export default function LibreReportPage() {
  const [lang, setLang] = useState<ReportLang>("ar");
  const [data, setData] = useState<LibreExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(14);
  const [endDate, setEndDate] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<string>("all");
  // ISO yyyy-mm-dd; shown as DD/MM/YYYY on the report header
  const [patientDob, setPatientDob] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const t = makeT(lang);

  const applyData = useCallback((parsed: LibreExport) => {
    setData(parsed);
    setError(null);
    const last = parsed.readings.at(-1)?.time;
    if (last) setEndDate(toIsoDate(last));
  }, []);

  useEffect(() => {
    document.title = lang === "ar" ? "تقارير الجلوكوز" : "Glucose Reports";
  }, [lang]);

  const onUpload = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        applyData(parseLibreExport(await file.text()));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [applyData],
  );

  const ctx: ReportContext | null = useMemo(() => {
    if (!data || !endDate) return null;
    const [y, m, d] = endDate.split("-").map(Number);
    const period = makePeriod(new Date(y, m - 1, d), days);
    const stats = computePeriodStats(data, period, DEFAULT_TARGETS);
    const historic = readingsInPeriod(data, period).filter((r) => r.historic);
    return {
      data,
      period,
      stats,
      days: computeDayStats(data, period, DEFAULT_TARGETS),
      agp: computeAgpProfile(historic),
      targets: DEFAULT_TARGETS,
      lang,
      patientName: data.generatedBy,
      patientDob: formatDisplayDate(patientDob),
      generatedAt: formatFullDate(new Date(), lang),
    };
  }, [data, endDate, days, lang, patientDob]);

  const show = (id: string) => selectedReport === "all" || selectedReport === id;

  return (
    <div className="lr-root" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="lr-toolbar lr-noprint">
        <div className="lr-toolbar-brand">{t("appTitle")}</div>
        <div className="lr-tool">
          <span>{t("reportPeriod")}</span>
          <Select
            value={String(days)}
            options={PERIOD_CHOICES.map((d) => ({
              value: String(d),
              label: `${d} ${t("days")}`,
            }))}
            onChange={(v) => setDays(Number(v))}
            ariaLabel={t("reportPeriod")}
          />
        </div>
        <div className="lr-tool">
          <span>{t("endDate")}</span>
          <DateField
            value={endDate}
            onChange={setEndDate}
            lang={lang}
            ariaLabel={t("endDate")}
          />
        </div>
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
        <div className="lr-tool lr-upload">
          <span>{t("uploadCsv")}</span>
          <label className="lr-field-btn lr-file-btn">
            <span className="lr-file-name">
              {fileName || (lang === "ar" ? "اختيار ملف…" : "Choose file…")}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileName(f.name);
                  void onUpload(f);
                }
              }}
            />
          </label>
        </div>
        <button type="button" className="lr-btn lr-btn-primary" onClick={() => window.print()}>
          {t("printReport")}
        </button>
        <button
          type="button"
          className="lr-btn"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        >
          {lang === "ar" ? "English" : "العربية"}
        </button>
      </div>

      {error ? <div className="lr-error">{error}</div> : null}
      {loading ? <div className="lr-loading">…</div> : null}

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
                  if (f) {
                    setFileName(f.name);
                    void onUpload(f);
                  }
                }}
              />
            </label>
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
          {show("device-details") ? <DeviceDetailsReport ctx={ctx} /> : null}
        </main>
      ) : null}
    </div>
  );
}
