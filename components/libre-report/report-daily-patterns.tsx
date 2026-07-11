import type { ReactElement } from "react";
import {
  formatGlucose,
  glucoseUnitLabel,
  makeT,
} from "../../lib/libre-report/i18n";
import { minutesOfDay, readingsInPeriod, twoHourAverages } from "../../lib/libre-report/stats";
import { AutoWidth } from "./auto-width";
import { AgpChart } from "./charts";
import type { ReportContext } from "./context";
import { ReportPage } from "./report-header";
import { hourLabel, LR_COLORS, xForMinutes } from "./primitives";

export function DailyPatternsReport({ ctx }: { ctx: ReportContext }): ReactElement {
  const t = makeT(ctx.lang);
  const { stats, lang, unit } = ctx;
  const historic = readingsInPeriod(ctx.data, ctx.period).filter((r) => r.historic);
  const blockAverages = twoHourAverages(historic);
  const foodInPeriod = ctx.data.food.filter(
    (f) => f.time >= ctx.period.start && f.time < ctx.period.end,
  );

  return (
    <ReportPage ctx={ctx} title={t("dailyPatterns")} id="daily-patterns">
      <div className="lr-dp-headerrow" dir="ltr">
        <div className="lr-dp-avgcell">
          <div className="lr-dp-avglabel">{t("dailyAverage")}</div>
          <div className="lr-dp-avgvalue">
            {stats.averageGlucose === null ? "—" : formatGlucose(stats.averageGlucose, unit, lang)}
          </div>
        </div>
        {blockAverages.map((v, i) => (
          <div key={i} className="lr-dp-blockcell">
            <div className="lr-dp-blockhour">{hourLabel(i * 2)}</div>
            <div className="lr-dp-blockvalue">{v === null ? "" : formatGlucose(v, unit, lang)}</div>
          </div>
        ))}
        <div className="lr-dp-blockcell">
          <div className="lr-dp-blockhour">00:00</div>
        </div>
      </div>

      <div className="lr-dp-chart">
        <div className="lr-dp-rowlabel">
          <span className="lr-dp-icon">💧</span> {t("glucose")}
          <div className="lr-dp-unit">{glucoseUnitLabel(unit, lang)}</div>
        </div>
        {ctx.agp ? (
          <AutoWidth>
            {(w) => (
              <AgpChart
                profile={ctx.agp!}
                targets={ctx.targets}
                lang={lang}
                unit={unit}
                height={300}
                width={w}
                yTicks={[0, 25, 50, 70, 100, 125, 150, 180, 200, 225, 250, 275, 300, 325, 350]}
              />
            )}
          </AutoWidth>
        ) : (
          <div className="lr-empty">{t("noData")}</div>
        )}
      </div>

      <div className="lr-dp-chart">
        <div className="lr-dp-rowlabel">
          <span className="lr-dp-icon">🍎</span> {t("carbs")}
          <div className="lr-dp-unit">{t("gramsUnit")}</div>
        </div>
        <AutoWidth>
          {(w) => <CarbsStrip food={foodInPeriod} lang={lang} width={w} />}
        </AutoWidth>
      </div>

      <div className="lr-dp-chart">
        <div className="lr-dp-rowlabel">
          <span className="lr-dp-icon">✎</span> {t("rapidActingInsulin")}
          <br />
          <span className="lr-dp-icon">💉</span> {t("longActingInsulin")}
        </div>
        <AutoWidth>
          {(w) => <InsulinStrip ctx={ctx} width={w} />}
        </AutoWidth>
      </div>
    </ReportPage>
  );
}

function CarbsStrip({
  food,
  lang,
  width = 700,
}: {
  food: ReportContext["data"]["food"];
  lang: ReportContext["lang"];
  width?: number;
}): ReactElement {
  const height = 90;
  const margin = { left: 34, right: 40, top: 12, bottom: 14 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const labelStep = width < 460 ? 4 : 2;
  const maxG = Math.max(30, ...food.map((f) => f.grams ?? 0));
  void lang;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-dp-strip" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        {Array.from({ length: 24 / labelStep + 1 }, (_, i) => i * labelStep).map((hh) => (
          <g key={hh}>
            <line
              x1={xForMinutes(hh * 60, w)}
              y1={0}
              x2={xForMinutes(hh * 60, w)}
              y2={h}
              stroke={LR_COLORS.gridLine}
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
            <text x={xForMinutes(hh * 60, w)} y={-3} fontSize={6.5} fill={LR_COLORS.axisText} textAnchor="middle" direction="ltr">
              {hourLabel(hh)}
            </text>
          </g>
        ))}
        {food
          .filter((f) => f.grams !== null)
          .map((f, i) => {
            const x = xForMinutes(minutesOfDay(f.time), w);
            const barH = ((f.grams as number) / maxG) * (h - 6);
            return (
              <rect key={i} x={x - 2} y={h - barH} width={4} height={barH} fill="#e8a33d">
                <title>{`${hourLabel(f.time.getHours())} — ${f.grams}g`}</title>
              </rect>
            );
          })}
        <text x={-4} y={h + 2} fontSize={7} fill={LR_COLORS.axisText} textAnchor="end" direction="ltr">
          0
        </text>
      </g>
    </svg>
  );
}

function InsulinStrip({
  ctx,
  width = 700,
}: {
  ctx: ReportContext;
  width?: number;
}): ReactElement {
  const height = 64;
  const margin = { left: 34, right: 40, top: 12, bottom: 6 };
  const w = width - margin.left - margin.right;
  const labelStep = width < 460 ? 4 : 2;
  const rowH = 20;
  const insulin = ctx.data.insulin.filter(
    (e) => e.time >= ctx.period.start && e.time < ctx.period.end,
  );
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-dp-strip" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {[0, 1].map((row) => (
          <rect
            key={row}
            x={0}
            y={row * (rowH + 4)}
            width={w}
            height={rowH}
            fill="#ffffff"
            stroke={LR_COLORS.gridLine}
            strokeWidth={0.7}
          />
        ))}
        {Array.from({ length: 24 / labelStep + 1 }, (_, i) => i * labelStep).map((hh) => (
          <g key={hh}>
            <line
              x1={xForMinutes(hh * 60, w)}
              y1={0}
              x2={xForMinutes(hh * 60, w)}
              y2={rowH * 2 + 4}
              stroke={LR_COLORS.gridLine}
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
            <text x={xForMinutes(hh * 60, w)} y={-3} fontSize={6.5} fill={LR_COLORS.axisText} textAnchor="middle" direction="ltr">
              {hourLabel(hh)}
            </text>
          </g>
        ))}
        {insulin.map((e, i) => {
          const isLong = e.kind === "long";
          const x = xForMinutes(minutesOfDay(e.time), w);
          const y = (isLong ? 1 : 0) * (rowH + 4) + rowH / 2;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2.4} fill={isLong ? "#3f9c35" : "#8dc63f"} />
              <title>{`${hourLabel(e.time.getHours())}${e.units !== null ? ` — ${e.units}u` : ""}`}</title>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
