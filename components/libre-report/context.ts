import type {
  AgpProfile,
  DayStats,
  GlucoseTargets,
  PeriodStats,
  ReportPeriod,
} from "../../lib/libre-report/stats";
import type { GlucoseUnit, ReportLang } from "../../lib/libre-report/i18n";
import type { LibreExport } from "../../lib/libre-report/types";

/** Everything a report section needs to render. */
export interface ReportContext {
  /**
   * The export the reports render. In separate-source mode this is narrowed
   * to a single app instance, so every statistic reflects what that one
   * instance could have produced.
   */
  data: LibreExport;
  /** The whole uploaded export, never narrowed — the Data Sources report
   * compares sources against each other and needs all of them. */
  fullData: LibreExport;
  /** Serial the reports are narrowed to, or null when sources are merged. */
  activeSource: string | null;
  /** Switch separate-source mode from inside a report. */
  onSelectSource?: (serial: string | null) => void;
  period: ReportPeriod;
  stats: PeriodStats;
  days: DayStats[];
  agp: AgpProfile | null;
  targets: GlucoseTargets;
  lang: ReportLang;
  /** Display unit for glucose values (stored values are always mg/dL). */
  unit: GlucoseUnit;
  patientName: string;
  patientDob: string;
  generatedAt: string;
}
