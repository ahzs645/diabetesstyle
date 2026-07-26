import type { ReactElement } from "react";
import { formatGlucose, glucoseUnitLabel, makeT } from "../../lib/libre-report/i18n";
import type { ReportContext } from "./context";
import { SensorIcon } from "./icons";
import { ReportPage } from "./report-header";

export function DeviceDetailsReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { targets, lang, unit } = ctx;
  return (
    <ReportPage ctx={ctx} title={t("deviceDetails")} subtitle={null} id="device-details">
      <div className="lr-columns">
        <div className="lr-col">
          <h3 className="lr-section-rule">{t("devices")}</h3>
          {ctx.data.devices.map((d) => (
            <div key={d} className="lr-device-card">
              <div className="lr-device-phone" aria-hidden>
                <SensorIcon />
              </div>
              <div>
                <div className="lr-device-name">{d}</div>
                {ctx.data.serials.map((s) => (
                  <div key={s} className="lr-device-serial">
                    <span className="lr-side-label">{t("serialNumber")}</span>
                    <div dir="ltr">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="lr-col lr-col-wide">
          <h3 className="lr-section-rule">{t("settings")}</h3>
          <table className="lr-settings-table">
            <tbody>
              <tr>
                <th>{t("targetRangeLabel")}</th>
                <td colSpan={2}>
                  <b dir="ltr">
                    {formatGlucose(targets.low, unit, lang)}-{formatGlucose(targets.high, unit, lang)}
                  </b>{" "}
                  {glucoseUnitLabel(unit, lang)}
                </td>
              </tr>
              <tr>
                <th rowSpan={3}>{t("glucoseAlarmSettings")}</th>
                <td>{t("lowGlucoseAlarm")}</td>
                <td>
                  <b>{t("off")}</b>
                  <span className="lr-settings-note"> ({t("notInExport")})</span>
                </td>
              </tr>
              <tr>
                <td>{t("highGlucoseAlarm")}</td>
                <td>
                  <b>{t("off")}</b>
                  <span className="lr-settings-note"> ({t("notInExport")})</span>
                </td>
              </tr>
              <tr>
                <td>{t("signalLoss")}</td>
                <td>
                  <b>{t("off")}</b>
                  <span className="lr-settings-note"> ({t("notInExport")})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ReportPage>
  );
}
