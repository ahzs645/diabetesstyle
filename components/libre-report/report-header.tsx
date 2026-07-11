import type { ReactElement, ReactNode } from "react";
import { formatPeriod, makeT } from "../../lib/libre-report/i18n";
import type { ReportContext } from "./context";

/**
 * Shared page chrome for every report: LibreView wordmark, report title +
 * period on the leading side, patient block on the trailing side.
 */
export function ReportPage({
  ctx,
  title,
  subtitle,
  children,
  id,
}: {
  ctx: ReportContext;
  title: string;
  /** Defaults to the formatted report period; pass null to hide. */
  subtitle?: string | null;
  children: ReactNode;
  id: string;
}): ReactElement {
  const t = makeT(ctx.lang);
  const period =
    subtitle === undefined
      ? formatPeriod(ctx.period.start, ctx.period.end, ctx.period.days, ctx.lang)
      : subtitle;
  return (
    <section className="lr-page" id={id} aria-label={title}>
      <header className="lr-page-header">
        <div className="lr-page-header-lead">
          <div className="lr-logo">{t("appTitle")}</div>
        </div>
        <div className="lr-page-header-main">
          <h2 className="lr-report-title">{title}</h2>
          {period ? <div className="lr-report-period">{period}</div> : null}
        </div>
        <div className="lr-page-header-trail">
          <div className="lr-patient-name">{ctx.patientName || "—"}</div>
          <div className="lr-patient-meta">
            {t("dob")}: <span dir="ltr">{ctx.patientDob || "—"}</span>
          </div>
          <div className="lr-patient-meta">
            {t("generated")}: <span dir="ltr">{ctx.generatedAt}</span>
          </div>
          <div className="lr-patient-meta lr-device-line">
            {t("device")}: {ctx.data.devices.join("، ") || "—"}
          </div>
        </div>
      </header>
      <div className="lr-page-body">{children}</div>
    </section>
  );
}
