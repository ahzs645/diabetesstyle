import type {
  AgpProfile,
  DayStats,
  GlucoseTargets,
  PeriodStats,
  ReportPeriod,
} from "../../lib/libre-report/stats";
import type { ReportLang } from "../../lib/libre-report/i18n";
import type { LibreExport } from "../../lib/libre-report/types";

/** Everything a report section needs to render. */
export interface ReportContext {
  data: LibreExport;
  period: ReportPeriod;
  stats: PeriodStats;
  days: DayStats[];
  agp: AgpProfile | null;
  targets: GlucoseTargets;
  lang: ReportLang;
  patientName: string;
  patientDob: string;
  generatedAt: string;
}
