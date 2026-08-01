import type { CSSProperties, ReactElement } from "react";
import type { A1cPoint, DailyMean } from "../../lib/libre-report/a1c";
import type { AgpProfile, GlucoseTargets, LowGlucoseEvent } from "../../lib/libre-report/stats";
import { minutesOfDay } from "../../lib/libre-report/stats";
import type { GlucoseReading } from "../../lib/libre-report/types";
import type { GlucoseUnit, ReportLang } from "../../lib/libre-report/i18n";
import { GlyphApple, GlyphSyringe } from "./icons";
import {
  formatDayMonth,
  formatDurationOfDay,
  formatFullDate,
  formatGlucose,
  formatNumber,
  formatPct,
  glucoseUnitLabel,
  makeT,
} from "../../lib/libre-report/i18n";
import {
  bandPath,
  dayCurvePath,
  GlucoseTicks,
  hourLabel,
  linePath,
  LR_COLORS,
  ScanDot,
  spreadPositions,
  TargetLines,
  TimeGrid,
  xForMinutes,
  yForGlucose,
} from "./primitives";

/* ------------------------------------------------------------------ */
/* Time in Ranges — stacked bar                                        */
/* ------------------------------------------------------------------ */

export interface TirSegment {
  key: "veryHigh" | "high" | "target" | "low" | "veryLow";
  pct: number;
}

const TIR_COLORS: Record<TirSegment["key"], string> = {
  veryHigh: LR_COLORS.veryHigh,
  high: LR_COLORS.high,
  target: LR_COLORS.target,
  low: LR_COLORS.low,
  veryLow: LR_COLORS.veryLow,
};

/**
 * Pixel heights for the stacked TIR bar. Zero/tiny segments keep a small
 * visible sliver, mirroring the printed bar.
 */
export function tirSegmentHeights(
  segments: TirSegment[],
  totalHeight: number,
  minSliver = 5,
): number[] {
  const raw = segments.map((s) => (s.pct / 100) * totalHeight);
  const heights = raw.map((h) => Math.max(h, minSliver));
  const excess = heights.reduce((a, b) => a + b, 0) - totalHeight;
  if (excess > 0) {
    // shrink the largest segment(s) to fit
    const order = [...heights.keys()].sort((a, b) => heights[b] - heights[a]);
    let remaining = excess;
    for (const idx of order) {
      const give = Math.min(remaining, heights[idx] - minSliver);
      heights[idx] -= give;
      remaining -= give;
      if (remaining <= 0) break;
    }
  }
  return heights;
}

export function TimeInRangesBar({
  tir,
  targets,
  lang,
  unit,
  height = 260,
  goals,
}: {
  tir: TirSegment[];
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  height?: number;
  /** Optional goal strings per group (insights variant). */
  goals?: { high?: string; target?: string; low?: string };
}): ReactElement {
  const t = makeT(lang);
  const heights = tirSegmentHeights(tir, height);
  const offsets: number[] = [];
  let acc = 0;
  for (const h of heights) {
    offsets.push(acc);
    acc += h;
  }
  const unitLabel = glucoseUnitLabel(unit, lang);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  const rows: {
    key: TirSegment["key"];
    title: string;
    range: string;
    pct: number;
  }[] = [
    {
      key: "veryHigh",
      title: t("veryHigh"),
      range: `>${g(targets.veryHigh)} ${unitLabel}`,
      pct: tir[0].pct,
    },
    {
      key: "high",
      title: t("high"),
      range: `${g(targets.high + 1)} - ${g(targets.veryHigh)} ${unitLabel}`,
      pct: tir[1].pct,
    },
    {
      key: "target",
      title: t("targetRange"),
      range: `${g(targets.low)} - ${g(targets.high)} ${unitLabel}`,
      pct: tir[2].pct,
    },
    {
      key: "low",
      title: t("low"),
      range: `${g(targets.veryLow)} - ${g(targets.low - 1)} ${unitLabel}`,
      pct: tir[3].pct,
    },
    {
      key: "veryLow",
      title: t("veryLow"),
      range: `<${g(targets.veryLow)} ${unitLabel}`,
      pct: tir[4].pct,
    },
  ];

  const labelCentres = spreadPositions(
    rows.map((_, i) => offsets[i] + heights[i] / 2),
    goals ? 42 : 36,
    18,
    height - 18,
  );

  const barWidth = 34;
  // Boundary labels sit at the segment edges, but tiny sliver segments would
  // stack them on top of each other (e.g. 250/180 when Very High + High are
  // both ~0%). Spread them apart and keep a tick at the true boundary.
  const thresholds = [
    { value: targets.veryHigh, boundary: offsets[1] },
    { value: targets.high, boundary: offsets[2] },
    { value: targets.low, boundary: offsets[3] },
    { value: targets.veryLow, boundary: offsets[4] },
  ];
  const threshLabelYs = spreadPositions(
    thresholds.map((th) => th.boundary),
    11,
    5,
    height - 3,
  );
  return (
    <div className="lr-tir" style={{ height }}>
      <svg
        width={barWidth + 30}
        height={height}
        className="lr-tir-bar"
        role="img"
        aria-label={t("timeInRanges")}
      >
        {tir.map((seg, i) => (
          <rect
            key={seg.key}
            x={26}
            y={offsets[i]}
            width={barWidth}
            height={Math.max(heights[i] - 1.5, 1)}
            fill={TIR_COLORS[seg.key]}
          >
            <title>{`${rows[i].title} ${rows[i].range}: ${formatNumber(seg.pct, lang)}%`}</title>
          </rect>
        ))}
        {/* threshold labels beside the bar */}
        {thresholds.map((th, i) => (
          <g key={th.value}>
            <line
              x1={23.5}
              y1={th.boundary}
              x2={25.5}
              y2={th.boundary}
              stroke="#999"
              strokeWidth={1}
            />
            <text
              x={21}
              y={threshLabelYs[i] + 3}
              className="lr-tir-thresh"
              textAnchor="end"
              direction="ltr"
            >
              {g(th.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="lr-tir-labels">
        {rows.map((row, i) => {
          const style: CSSProperties = { top: labelCentres[i] };
          return (
            <div key={row.key} className="lr-tir-label" style={style}>
              <div className="lr-tir-label-main">
                <span className="lr-tir-title">{row.title}</span>{" "}
                <span className="lr-tir-range" dir="ltr">
                  {row.range}
                </span>
                {goals && row.key === "high" && goals.high ? (
                  <span className="lr-tir-goal">{goals.high}</span>
                ) : null}
                {goals && row.key === "target" && goals.target ? (
                  <span className="lr-tir-goal">{goals.target}</span>
                ) : null}
                {goals && row.key === "low" && goals.low ? (
                  <span className="lr-tir-goal">{goals.low}</span>
                ) : null}
              </div>
              <div className="lr-tir-pct">
                <b>{formatPct(row.pct, lang)}</b>
                <span className="lr-tir-duration">
                  ({formatDurationOfDay(row.pct, lang)})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ambulatory Glucose Profile chart                                    */
/* ------------------------------------------------------------------ */

export function AgpChart({
  profile,
  targets,
  lang,
  unit,
  width = 700,
  height = 240,
  yMax = 350,
  yTicks = [0, 70, 180, 250, 350],
  showPercentileLabels = true,
  showTargetBracket = true,
}: {
  profile: AgpProfile;
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
  yMax?: number;
  yTicks?: number[];
  showPercentileLabels?: boolean;
  showTargetBracket?: boolean;
}): ReactElement {
  const t = makeT(lang);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  const margin = { left: 34, right: showPercentileLabels ? 40 : 8, top: 8, bottom: 16 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const gridStep = width < 460 ? 6 : 3;
  const xs = profile.binMinutes.map((m) => xForMinutes(m, w));
  const y = (v: number) => yForGlucose(v, yMax, h);
  const last = profile.binMinutes.length - 1;

  const pctLabels: { label: string; value: number; strong?: boolean }[] = [
    { label: "95%", value: profile.p95[last] },
    { label: "75%", value: profile.p75[last] },
    { label: "50%", value: profile.p50[last], strong: true },
    { label: "25%", value: profile.p25[last] },
    { label: "5%", value: profile.p5[last] },
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="lr-agp"
      role="img"
      aria-label={t("agpSectionTitle")}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#fdfdfd" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <TimeGrid width={w} height={h} stepHours={gridStep} />
        {/* midday emphasis line */}
        <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#9a9a9a" strokeWidth={0.9} />
        <path d={bandPath(xs, profile.p95.map(y), profile.p5.map(y))} fill={LR_COLORS.band595} />
        <path d={bandPath(xs, profile.p75.map(y), profile.p25.map(y))} fill={LR_COLORS.band2575} />
        <TargetLines width={w} height={h} yMax={yMax} low={targets.low} high={targets.high} />
        <path
          d={linePath(xs, profile.p50.map(y))}
          fill="none"
          stroke={LR_COLORS.median}
          strokeWidth={2.4}
        />
        {/* hover: one transparent column per bin with a native tooltip */}
        {xs.map((x, i) => (
          <rect
            key={i}
            x={i === 0 ? 0 : (xs[i - 1] + x) / 2}
            y={0}
            width={i === 0 ? x : i === last ? w - (xs[i - 1] + x) / 2 : (xs[Math.min(i + 1, last)] - xs[i - 1]) / 2}
            height={h}
            fill="transparent"
          >
            <title>
              {`${hourLabel(Math.floor(profile.binMinutes[i] / 60))} — ${t("median")} ${g(profile.p50[i])} (${g(profile.p5[i])}–${g(profile.p95[i])} ${glucoseUnitLabel(unit, lang)})`}
            </title>
          </rect>
        ))}
        <GlucoseTicks ticks={yTicks} yMax={yMax} height={h} x={-4} bold={[targets.low, targets.high]} format={g} />
        {showTargetBracket ? (
          <g>
            <path
              d={`M-26,${y(targets.high)} h6 M-26,${y(targets.low)} h6 M-26,${y(targets.high)} v${y(targets.low) - y(targets.high)}`}
              stroke={LR_COLORS.targetLine}
              strokeWidth={1.4}
              fill="none"
            />
          </g>
        ) : null}
        {showPercentileLabels ? (
          <g>
            {spreadPositions(
              pctLabels.map((p) => y(p.value)),
              9,
              4,
              h - 2,
            ).map((yy, i) => ({ ...pctLabels[i], yy })).map((p) => (
              <text
                key={p.label}
                x={w + 6}
                y={p.yy + 3}
                fontSize={p.strong ? 9 : 8}
                fontWeight={p.strong ? 700 : 400}
                fill={p.strong ? LR_COLORS.median : LR_COLORS.axisText}
                direction="ltr"
              >
                {p.strong ? `‏${p.label}‏` : p.label}
              </text>
            ))}
          </g>
        ) : null}
      </g>
      <text
        x={margin.left - 4}
        y={margin.top + 13}
        fontSize={6.5}
        fill={LR_COLORS.axisText}
        textAnchor="end"
      >
        {glucoseUnitLabel(unit, lang)}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Full-width single-day chart (Daily Log / Weekly Summary rows)       */
/* ------------------------------------------------------------------ */

export function DayChart({
  historic,
  scans,
  targets,
  lang,
  unit,
  width = 700,
  height = 110,
  yMax = 350,
  showScans = true,
  markers,
}: {
  historic: GlucoseReading[];
  scans: GlucoseReading[];
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
  yMax?: number;
  showScans?: boolean;
  markers?: { minutes: number; label: string; kind: "food" | "insulin" | "note" }[];
}): ReactElement {
  const margin = { left: 30, right: 6, top: 10, bottom: 14 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const labelStep = width < 460 ? 4 : 2;
  const t = makeT(lang);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-daychart" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <rect
          x={0}
          y={yForGlucose(targets.high, yMax, h)}
          width={w}
          height={yForGlucose(targets.low, yMax, h) - yForGlucose(targets.high, yMax, h)}
          fill={LR_COLORS.targetBand}
        />
        <TimeGrid width={w} height={h} stepHours={2} labels={false} />
        <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#9a9a9a" strokeWidth={0.8} />
        <line x1={w * 0.75} y1={0} x2={w * 0.75} y2={h} stroke="#bbbbbb" strokeWidth={0.8} />
        <line x1={w * 0.25} y1={0} x2={w * 0.25} y2={h} stroke="#bbbbbb" strokeWidth={0.8} />
        <path
          d={dayCurvePath(historic, w, h, yMax)}
          fill="none"
          stroke={LR_COLORS.dayLine}
          strokeWidth={1.4}
        />
        {showScans
          ? scans.map((r, i) => (
              <g key={i}>
                <ScanDot
                  cx={xForMinutes(minutesOfDay(r.time), w)}
                  cy={yForGlucose(r.mgdl, yMax, h)}
                />
                <title>{`${hourLabel(r.time.getHours())} ${g(r.mgdl)} ${glucoseUnitLabel(unit, lang)}`}</title>
              </g>
            ))
          : null}
        {markers?.map((m, i) => (
          <g key={`m${i}`}>
            {m.kind === "food" ? (
              <GlyphApple x={xForMinutes(m.minutes, w)} y={h - 2} size={9} />
            ) : m.kind === "insulin" ? (
              <GlyphSyringe x={xForMinutes(m.minutes, w)} y={h - 2} size={9} />
            ) : (
              <rect
                x={xForMinutes(m.minutes, w) - 2}
                y={h - 7}
                width={4}
                height={4}
                fill="currentColor"
              />
            )}
            <title>{m.label}</title>
          </g>
        ))}
        <GlucoseTicks ticks={[0, targets.low, targets.high, yMax]} yMax={yMax} height={h} x={-4} bold={[targets.low, targets.high]} format={g} />
        {/* hour labels every 2h at the top, like the printed daily log */}
        {Array.from({ length: 24 / labelStep + 1 }, (_, i) => i * labelStep).map((hh) => (
          <text
            key={hh}
            x={xForMinutes(hh * 60, w)}
            y={-3}
            fontSize={6.5}
            fill={LR_COLORS.axisText}
            textAnchor="middle"
            direction="ltr"
          >
            {hourLabel(hh)}
          </text>
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small daily-profile thumbnail (AGP report bottom grid)              */
/* ------------------------------------------------------------------ */

export function DailyProfileThumb({
  historic,
  targets,
  dayNumber,
  lang,
  unit,
  width = 96,
  height = 64,
  yMax = 350,
  showYLabels = false,
}: {
  historic: GlucoseReading[];
  targets: GlucoseTargets;
  dayNumber: number;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
  yMax?: number;
  showYLabels?: boolean;
}): ReactElement {
  const w = width;
  const h = height;
  const yHigh = yForGlucose(targets.high, yMax, h);
  const yLow = yForGlucose(targets.low, yMax, h);
  // Excursion fills: polygons closed along the threshold line, clipped to
  // the region beyond the threshold.
  const segments: GlucoseReading[][] = [];
  let current: GlucoseReading[] = [];
  let prev: GlucoseReading | null = null;
  for (const r of historic) {
    if (prev && r.time.getTime() - prev.time.getTime() > 45 * 60000) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(r);
    prev = r;
  }
  if (current.length > 1) segments.push(current);

  const clipAbove = `lr-clip-above-${dayNumber}-${Math.round(yHigh)}`;
  const clipBelow = `lr-clip-below-${dayNumber}-${Math.round(yLow)}`;

  const excursion = (seg: GlucoseReading[], closeY: number) => {
    const pts = seg.map(
      (r) =>
        `${xForMinutes(minutesOfDay(r.time), w).toFixed(1)},${yForGlucose(r.mgdl, yMax, h).toFixed(1)}`,
    );
    const first = xForMinutes(minutesOfDay(seg[0].time), w).toFixed(1);
    const lastX = xForMinutes(minutesOfDay(seg[seg.length - 1].time), w).toFixed(1);
    return `M${first},${closeY.toFixed(1)}L${pts.join("L")}L${lastX},${closeY.toFixed(1)}Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="lr-thumb" role="img">
      <defs>
        <clipPath id={clipAbove}>
          <rect x={0} y={0} width={w} height={yHigh} />
        </clipPath>
        <clipPath id={clipBelow}>
          <rect x={0} y={yLow} width={w} height={h - yLow} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke="#c8c8c8" strokeWidth={0.8} />
      <rect x={0} y={yHigh} width={w} height={yLow - yHigh} fill={LR_COLORS.targetBand} />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#c0c0c0" strokeWidth={0.6} strokeDasharray="2,2" />
      {segments.map((seg, i) => (
        <g key={i}>
          <path d={excursion(seg, yHigh)} fill={LR_COLORS.aboveFill} clipPath={`url(#${clipAbove})`} opacity={0.9} />
          <path d={excursion(seg, yLow)} fill={LR_COLORS.belowFill} clipPath={`url(#${clipBelow})`} opacity={0.9} />
        </g>
      ))}
      <path d={dayCurvePath(historic, w, h, yMax)} fill="none" stroke={LR_COLORS.dayLine} strokeWidth={1.1} />
      <rect x={0.5} y={0.5} width={13} height={10} fill="#ffffff" stroke="#c8c8c8" strokeWidth={0.6} />
      <text x={7} y={8.2} fontSize={7} fontWeight={600} textAnchor="middle" fill={LR_COLORS.ink} direction="ltr">
        {dayNumber}
      </text>
      {showYLabels ? (
        <g>
          <text x={2} y={yHigh - 1.5} fontSize={5.5} fill={LR_COLORS.axisText} direction="ltr">
            {formatGlucose(targets.high, unit, lang)}
          </text>
          <text x={2} y={yLow + 6} fontSize={5.5} fill={LR_COLORS.axisText} direction="ltr">
            {formatGlucose(targets.low, unit, lang)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Snapshot charts                                                     */
/* ------------------------------------------------------------------ */

export function MedianChart({
  profile,
  targets,
  lang,
  unit,
  width = 340,
  height = 170,
}: {
  profile: AgpProfile;
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 30, right: 8, top: 14, bottom: 16 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const yMax = 350;
  const xs = profile.binMinutes.map((m) => xForMinutes(m, w));
  const y = (v: number) => yForGlucose(v, yMax, h);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-snapchart" role="img" aria-label={t("averageGlucose")}>
      <text x={margin.left + w / 2} y={9} fontSize={8} textAnchor="middle" fill={LR_COLORS.ink}>
        {t("averageGlucose")}
      </text>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <TimeGrid width={w} height={h} stepHours={6} />
        <path d={bandPath(xs, profile.p95.map(y), profile.p5.map(y))} fill={LR_COLORS.band595} />
        <TargetLines width={w} height={h} yMax={yMax} low={targets.low} high={targets.high} color="#8a8a8a" />
        <path d={linePath(xs, profile.p50.map(y))} fill="none" stroke={LR_COLORS.median} strokeWidth={2} />
        <GlucoseTicks ticks={[0, targets.low, targets.high, yMax]} yMax={yMax} height={h} x={-4} format={(v) => formatGlucose(v, unit, lang)} />
      </g>
    </svg>
  );
}

export function LowEventsChart({
  events,
  lang,
  unit,
  width = 340,
  height = 170,
  threshold = 70,
}: {
  events: LowGlucoseEvent[];
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
  threshold?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 30, right: 8, top: 14, bottom: 16 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const yMin = 40;
  const yMax = 100;
  const y = (v: number) => h - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * h;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-snapchart" role="img" aria-label={t("lowGlucoseEvents")}>
      <text x={margin.left + w / 2} y={9} fontSize={8} textAnchor="middle" fill={LR_COLORS.ink}>
        {t("lowGlucoseEvents")}
      </text>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <TimeGrid width={w} height={h} stepHours={6} />
        {[40, 50, 60, 70, 80, 90, 100].map((tick) => (
          <g key={tick}>
            <text x={-4} y={y(tick) + 2.5} fontSize={7} fill={tick === threshold ? LR_COLORS.low : LR_COLORS.axisText} textAnchor="end" direction="ltr">
              {formatGlucose(tick, unit, lang)}
            </text>
          </g>
        ))}
        <line x1={0} y1={y(threshold)} x2={w} y2={y(threshold)} stroke={LR_COLORS.low} strokeWidth={1} />
        {events.map((e, i) => (
          <circle
            key={i}
            cx={xForMinutes(minutesOfDay(e.start), w)}
            cy={y(e.nadir)}
            r={3}
            fill={LR_COLORS.low}
          >
            <title>{`${hourLabel(e.start.getHours())} — ${formatGlucose(e.nadir, unit, lang)} (${Math.round(e.durationMin)} ${t("minutes")})`}</title>
          </circle>
        ))}
      </g>
    </svg>
  );
}

export function SensorUsageChart({
  usage,
  lang,
  width = 340,
  height = 150,
}: {
  /** % of days covered, per time-of-day bin. */
  usage: number[];
  lang: ReportLang;
  width?: number;
  height?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 34, right: 8, top: 14, bottom: 16 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const xs = usage.map((_, i) => (i / (usage.length - 1)) * w);
  const ys = usage.map((u) => h - (u / 100) * h);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-snapchart" role="img" aria-label={t("pctTimeActive")}>
      <text x={margin.left + w / 2} y={9} fontSize={8} textAnchor="middle" fill={LR_COLORS.ink}>
        {t("pctTimeActive")}
      </text>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <TimeGrid width={w} height={h} stepHours={6} />
        {[0, 50, 100].map((tick) => (
          <text key={tick} x={-4} y={h - (tick / 100) * h + 2.5} fontSize={7} fill={LR_COLORS.axisText} textAnchor="end" direction="ltr">
            {formatPct(tick, lang)}
          </text>
        ))}
        <path
          d={`${linePath(xs, ys)}L${w},${h}L0,${h}Z`}
          fill="#bfe3ee"
          stroke="none"
          opacity={0.8}
        />
        <path d={linePath(xs, ys)} fill="none" stroke="#59b8d4" strokeWidth={1.6} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Pattern-insights scatter chart                                      */
/* ------------------------------------------------------------------ */

export function PatternsScatterChart({
  historic,
  profile,
  targets,
  lang,
  unit,
  width = 700,
  height = 260,
}: {
  historic: GlucoseReading[];
  profile: AgpProfile | null;
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 50, right: 40, top: 8, bottom: 30 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const yMax = 350;
  const y = (v: number) => yForGlucose(v, yMax, h);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  const colorFor = (v: number) =>
    v < targets.low
      ? LR_COLORS.low
      : v <= targets.high
        ? "#8dc63f"
        : v <= targets.veryHigh
          ? LR_COLORS.high
          : LR_COLORS.veryHigh;
  const periods = [
    { label: t("night"), from: 0, to: 6 },
    { label: t("morning"), from: 6, to: 12 },
    { label: t("midday"), from: 12, to: 18 },
    { label: t("evening"), from: 18, to: 24 },
  ];
  const xs = profile ? profile.binMinutes.map((m) => xForMinutes(m, w)) : [];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-patterns" role="img" aria-label={t("glucosePatterns")}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <TimeGrid width={w} height={h} stepHours={3} labels={false} />
        {historic.map((r, i) => (
          <circle
            key={i}
            cx={xForMinutes(minutesOfDay(r.time), w) + ((i * 7919) % 11) * 0.35 - 1.9}
            cy={y(r.mgdl)}
            r={1.1}
            fill={colorFor(r.mgdl)}
            opacity={0.55}
          />
        ))}
        {/* target boundary chips */}
        <rect x={-26} y={y(targets.high) - 5} width={24} height={10} rx={2} fill={LR_COLORS.target} />
        <text x={-14} y={y(targets.high) + 3} fontSize={7} fill="#ffffff" textAnchor="middle" direction="ltr">
          {g(targets.high)}
        </text>
        <rect x={-26} y={y(targets.low) - 5} width={24} height={10} rx={2} fill={LR_COLORS.target} />
        <text x={-14} y={y(targets.low) + 3} fontSize={7} fill="#ffffff" textAnchor="middle" direction="ltr">
          {g(targets.low)}
        </text>
        <line x1={0} y1={y(targets.high)} x2={w} y2={y(targets.high)} stroke={LR_COLORS.target} strokeWidth={1.2} />
        <line x1={0} y1={y(targets.low)} x2={w} y2={y(targets.low)} stroke={LR_COLORS.target} strokeWidth={1.2} />
        {profile ? (
          <g>
            <path d={linePath(xs, profile.p50.map(y))} fill="none" stroke="#2e7d32" strokeWidth={2} />
            <path d={linePath(xs, profile.p5.map(y))} fill="none" stroke="#8a8a8a" strokeWidth={0.9} strokeDasharray="3,2" />
            <path d={linePath(xs, profile.p95.map(y))} fill="none" stroke="#8a8a8a" strokeWidth={0.9} strokeDasharray="3,2" />
            <text x={w + 4} y={y(profile.p95[profile.p95.length - 1]) + 2} fontSize={7.5} fill={LR_COLORS.axisText} direction="ltr">95%</text>
            <text x={w + 4} y={y(profile.p50[profile.p50.length - 1]) + 2} fontSize={8} fontWeight={700} fill="#2e7d32" direction="ltr">50%</text>
            <text x={w + 4} y={y(profile.p5[profile.p5.length - 1]) + 2} fontSize={7.5} fill={LR_COLORS.axisText} direction="ltr">5%</text>
          </g>
        ) : null}
        {/* period strip */}
        <g>
          {periods.map((p, i) => (
            <g key={p.label}>
              <rect
                x={xForMinutes(p.from * 60, w)}
                y={h}
                width={xForMinutes((p.to - p.from) * 60, w)}
                height={13}
                fill={i % 2 ? "#f2f2f2" : "#e8e8e8"}
                stroke={LR_COLORS.gridLine}
                strokeWidth={0.5}
              />
              <text
                x={xForMinutes(((p.from + p.to) / 2) * 60, w)}
                y={h + 9}
                fontSize={7}
                textAnchor="middle"
                fill={LR_COLORS.ink}
              >
                {p.label}
              </text>
            </g>
          ))}
          {(width < 460 ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24]).map((hh) => (
            <text
              key={hh}
              x={xForMinutes(hh * 60, w)}
              y={h + 24}
              fontSize={7.5}
              fill={hh % 12 === 0 ? LR_COLORS.ink : LR_COLORS.axisText}
              fontWeight={hh % 12 === 0 ? 700 : 400}
              textAnchor="middle"
              direction="ltr"
            >
              {hourLabel(hh)}
            </text>
          ))}
        </g>
        <GlucoseTicks ticks={[0, 54, 250, 350]} yMax={yMax} height={h} x={-30} format={g} />
      </g>
    </svg>
  );
}


/* ------------------------------------------------------------------ */
/* Mealtime-patterns period chart                                      */
/* ------------------------------------------------------------------ */

export function MealPeriodChart({
  lang,
  unit,
  width = 170,
  height = 150,
  showSideLabels,
  mealCurves,
}: {
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
  /** show 130/70 on the left (first panel) or 180/100 on the right (last). */
  showSideLabels?: "pre" | "post";
  /** Averaged relative-time curve around logged meals, if any. */
  mealCurves?: { relMinutes: number[]; values: number[] } | null;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 20, right: 16, top: 6, bottom: 26 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const yMax = 350;
  const y = (v: number) => yForGlucose(v, yMax, h);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  // x spans -1h .. +3h around the meal
  const x = (rel: number) => ((rel + 60) / (4 * 60)) * w;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-mealchart" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        {/* pre-meal target box 70-130 over -1h..0 */}
        <rect x={x(-60)} y={y(130)} width={x(0) - x(-60)} height={y(70) - y(130)} fill="#d9d9d9" />
        {/* post-meal target box 100-180 over 0..+3h */}
        <rect x={x(0)} y={y(180)} width={x(180) - x(0)} height={y(100) - y(180)} fill="#d9d9d9" />
        <line x1={x(0)} y1={0} x2={x(0)} y2={h} stroke="#e8a33d" strokeWidth={1.4} />
        {[60, 120, 180].map((rel) => (
          <line key={rel} x1={x(rel)} y1={0} x2={x(rel)} y2={h} stroke={LR_COLORS.gridLine} strokeWidth={0.6} strokeDasharray="2,2" />
        ))}
        {mealCurves && mealCurves.relMinutes.length > 1 ? (
          <path
            d={linePath(mealCurves.relMinutes.map(x), mealCurves.values.map(y))}
            fill="none"
            stroke={LR_COLORS.dayLine}
            strokeWidth={1.6}
          />
        ) : null}
        {[0, 50, 150, 250, 350].map((tick) => (
          <text key={tick} x={-3} y={y(tick) + 2.5} fontSize={6.5} fill={LR_COLORS.axisText} textAnchor="end" direction="ltr">
            {g(tick)}
          </text>
        ))}
        {showSideLabels === "pre" ? (
          <g>
            <text x={-3} y={y(130) + 2.5} fontSize={6.5} fontWeight={700} fill={LR_COLORS.ink} textAnchor="end" direction="ltr">{g(130)}</text>
            <text x={-3} y={y(70) + 2.5} fontSize={6.5} fontWeight={700} fill={LR_COLORS.ink} textAnchor="end" direction="ltr">{g(70)}</text>
          </g>
        ) : null}
        {showSideLabels === "post" ? (
          <g>
            <text x={w + 3} y={y(180) + 2.5} fontSize={6.5} fontWeight={700} fill={LR_COLORS.ink} direction="ltr">{g(180)}</text>
            <text x={w + 3} y={y(100) + 2.5} fontSize={6.5} fontWeight={700} fill={LR_COLORS.ink} direction="ltr">{g(100)}</text>
          </g>
        ) : null}
        <GlyphApple x={x(0)} y={h + 11} size={8} />
        <text x={x(-60) + (x(0) - x(-60)) / 2} y={h + 20} fontSize={6} fill={LR_COLORS.axisText} textAnchor="middle">
          {t("preMeal")}
        </text>
        <text x={x(0) + (x(180) - x(0)) / 2} y={h + 20} fontSize={6} fill={LR_COLORS.axisText} textAnchor="middle">
          {t("postMeal")}
        </text>
        {[-60, 60, 120, 180].map((rel) => (
          <text key={rel} x={x(rel)} y={h + 10} fontSize={5.5} fill={LR_COLORS.axisText} textAnchor="middle" direction="ltr">
            {rel === -60 ? (lang === "ar" ? "1- ساعة" : "-1hr") : lang === "ar" ? `${rel / 60}+ ساعة` : `+${rel / 60}hr`}
          </text>
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Estimated-A1C charts                                                */
/* ------------------------------------------------------------------ */

/** ~6 evenly spaced x-axis label indexes for a day-indexed series. */
function dayLabelIndexes(count: number, maxLabels = 6): number[] {
  if (count <= maxLabels) return [...Array(count).keys()];
  const step = Math.ceil(count / (maxLabels - 1));
  const out: number[] = [];
  for (let i = 0; i < count - step / 2; i += step) out.push(i);
  out.push(count - 1);
  return out;
}

export function DailyMeanBarChart({
  daily,
  targets,
  lang,
  unit,
  width = 700,
  height = 190,
}: {
  daily: DailyMean[];
  targets: GlucoseTargets;
  lang: ReportLang;
  unit: GlucoseUnit;
  width?: number;
  height?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 34, right: 8, top: 8, bottom: 18 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const maxMean = Math.max(targets.high, ...daily.map((d) => d.meanMgdl ?? 0));
  const yMax = Math.ceil((maxMean * 1.15) / 50) * 50;
  const y = (v: number) => yForGlucose(v, yMax, h);
  const g = (mgdl: number) => formatGlucose(mgdl, unit, lang);
  const slot = w / daily.length;
  const barW = Math.max(1, Math.min(16, slot * 0.7));
  const colorFor = (v: number) =>
    v < targets.low ? LR_COLORS.low : v <= targets.high ? LR_COLORS.target : LR_COLORS.high;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-a1c-chart" role="img" aria-label={t("a1cChartDailyTitle")}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        <rect x={0} y={y(targets.high)} width={w} height={y(targets.low) - y(targets.high)} fill={LR_COLORS.targetBand} />
        {daily.map((d, i) =>
          d.meanMgdl === null ? null : (
            <rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={y(d.meanMgdl)}
              width={barW}
              height={h - y(d.meanMgdl)}
              fill={colorFor(d.meanMgdl)}
              opacity={0.85}
            >
              <title>{`${formatFullDate(d.day, lang)} — ${g(d.meanMgdl)} ${glucoseUnitLabel(unit, lang)} (${d.n})`}</title>
            </rect>
          ),
        )}
        <GlucoseTicks
          ticks={[0, targets.low, targets.high, yMax]}
          yMax={yMax}
          height={h}
          x={-4}
          bold={[targets.low, targets.high]}
          format={g}
        />
        {dayLabelIndexes(daily.length, width < 460 ? 4 : 6).map((i) => (
          <text
            key={i}
            x={i * slot + slot / 2}
            y={h + 12}
            fontSize={7.5}
            fill={LR_COLORS.axisText}
            textAnchor="middle"
          >
            {formatDayMonth(daily[i].day, lang)}
          </text>
        ))}
      </g>
    </svg>
  );
}

/**
 * eA1C-over-time line: one slot per calendar day, gaps where a slot has no
 * data. Used both for the cumulative build-up within the report period and
 * for the rolling-window trend across the whole dataset.
 */
export function Ea1cLineChart({
  points,
  lang,
  width = 700,
  height = 200,
  highlight,
  goalPct = 7,
}: {
  points: (A1cPoint | null)[];
  lang: ReportLang;
  width?: number;
  height?: number;
  /** Inclusive day-index range to shade (e.g. the selected report period). */
  highlight?: { from: number; to: number };
  /** Dashed reference line (GMI/A1C goal), drawn when inside the scale. */
  goalPct?: number;
}): ReactElement {
  const t = makeT(lang);
  const margin = { left: 34, right: 30, top: 8, bottom: 18 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const values = points.filter((p): p is A1cPoint => p !== null).map((p) => p.ea1cPercent);
  if (values.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="lr-a1c-chart" role="img">
        <text x={width / 2} y={height / 2} fontSize={9} textAnchor="middle" fill={LR_COLORS.axisText}>
          {t("noData")}
        </text>
      </svg>
    );
  }
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max(0.15, (hi - lo) * 0.2);
  lo -= pad;
  hi += pad;
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2].find((s) => (hi - lo) / s <= 6) ?? 5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  const x = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  // line path with gaps at null slots
  let d = "";
  let prevNull = true;
  points.forEach((p, i) => {
    if (p === null) {
      prevNull = true;
      return;
    }
    d += `${prevNull ? "M" : "L"}${x(i).toFixed(1)},${y(p.ea1cPercent).toFixed(1)}`;
    prevNull = false;
  });
  let lastIdx = points.length - 1;
  while (lastIdx >= 0 && points[lastIdx] === null) lastIdx--;
  const last = points[lastIdx] as A1cPoint;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-a1c-chart" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LR_COLORS.gridLine} strokeWidth={0.7} />
        {highlight ? (
          <rect
            x={x(highlight.from)}
            y={0}
            width={Math.max(1.5, x(highlight.to) - x(highlight.from))}
            height={h}
            fill="#dcecf7"
          />
        ) : null}
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={0} y1={y(tick)} x2={w} y2={y(tick)} stroke={LR_COLORS.gridLine} strokeWidth={0.6} strokeDasharray="2,3" />
            <text x={-4} y={y(tick) + 2.5} fontSize={7.5} fill={LR_COLORS.axisText} textAnchor="end" direction="ltr">
              {formatPct(tick, lang, step < 0.25 ? 2 : 1)}
            </text>
          </g>
        ))}
        {goalPct > lo && goalPct < hi ? (
          <line x1={0} y1={y(goalPct)} x2={w} y2={y(goalPct)} stroke={LR_COLORS.high} strokeWidth={1} strokeDasharray="5,3" />
        ) : null}
        <path d={d} fill="none" stroke={LR_COLORS.median} strokeWidth={1.8} />
        <circle cx={x(lastIdx)} cy={y(last.ea1cPercent)} r={2.6} fill={LR_COLORS.median} />
        <text
          x={x(lastIdx) + 4}
          y={y(last.ea1cPercent) - 5}
          fontSize={8.5}
          fontWeight={700}
          fill={LR_COLORS.median}
          direction="ltr"
        >
          {formatPct(last.ea1cPercent, lang, 1)}
        </text>
        {/* hover: one transparent column per day with a native tooltip */}
        {points.map((p, i) =>
          p === null ? null : (
            <rect
              key={i}
              x={x(i) - (w / points.length) / 2}
              y={0}
              width={Math.max(1, w / points.length)}
              height={h}
              fill="transparent"
            >
              <title>
                {`${formatFullDate(p.day, lang)} — ${formatPct(p.ea1cPercent, lang, 2)} (${t("a1cMeanShort")} ${formatNumber(p.meanMgdl, lang)} · ${p.n} ${t("a1cReadingsUsed")})`}
              </title>
            </rect>
          ),
        )}
        {dayLabelIndexes(points.length, width < 460 ? 4 : 6).map((i) => {
          const p = points[i];
          return p === null ? null : (
            <text key={i} x={x(i)} y={h + 12} fontSize={7.5} fill={LR_COLORS.axisText} textAnchor="middle">
              {formatDayMonth(p.day, lang)}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Source coverage timeline                                            */
/* ------------------------------------------------------------------ */

export interface SourceTimelineRow {
  label: string;
  /** One flag per day from `startDay`: did this source record that day? */
  days: boolean[];
}

/**
 * One lane per data source across the whole dataset, a tick for every day
 * that source recorded. Read together with the shaded report period it shows
 * at a glance which instance could — and could not — have backed a value.
 */
export function SourceTimelineChart({
  rows,
  startDay,
  lang,
  width = 700,
  highlight,
}: {
  rows: SourceTimelineRow[];
  /** Calendar day the first column represents. */
  startDay: Date;
  lang: ReportLang;
  width?: number;
  /** Inclusive day-index range to shade (the selected report period). */
  highlight?: { from: number; to: number };
}): ReactElement {
  const t = makeT(lang);
  const dayCount = Math.max(1, ...rows.map((r) => r.days.length));
  const laneH = 18;
  const laneGap = 6;
  // right margin leaves room for the last date label, which is centred on
  // the final column and would otherwise be clipped by the viewBox
  const margin = { left: 74, right: 30, top: 6, bottom: 18 };
  const w = Math.max(40, width - margin.left - margin.right);
  const h = rows.length * laneH + Math.max(0, rows.length - 1) * laneGap;
  const height = h + margin.top + margin.bottom;
  const colW = w / dayCount;
  const x = (i: number) => (i / dayCount) * w;
  const dayAt = (i: number) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return d;
  };

  if (rows.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} 40`} className="lr-src-timeline" role="img">
        <text x={width / 2} y={22} fontSize={9} textAnchor="middle" fill={LR_COLORS.axisText}>
          {t("noData")}
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="lr-src-timeline" role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Painted in three passes so the period band reads across every
            lane: empty lanes first, the band over them, then the data on
            top. A single pass would either bury the band under the opaque
            lane backgrounds or let it wash out the data. */}
        {rows.map((row, ri) => (
          <rect
            key={`lane-${row.label}`}
            x={0}
            y={ri * (laneH + laneGap)}
            width={w}
            height={laneH}
            fill="#f4f4f4"
            stroke={LR_COLORS.gridLine}
            strokeWidth={0.6}
          />
        ))}
        {highlight ? (
          <rect
            x={x(highlight.from)}
            y={-2}
            width={Math.max(1.5, x(highlight.to + 1) - x(highlight.from))}
            height={h + 4}
            fill="#dcecf7"
          />
        ) : null}
        {rows.map((row, ri) => {
          const y = ri * (laneH + laneGap);
          return (
            <g key={row.label}>
              {row.days.map((has, i) =>
                has ? (
                  <rect
                    key={i}
                    x={x(i)}
                    y={y + 1}
                    width={Math.max(0.6, colW)}
                    height={laneH - 2}
                    fill={LR_COLORS.median}
                  >
                    <title>{`${row.label} — ${formatFullDate(dayAt(i), lang)}`}</title>
                  </rect>
                ) : null,
              )}
              <text
                x={-6}
                y={y + laneH / 2 + 3}
                fontSize={8}
                fill={LR_COLORS.ink}
                textAnchor="end"
                direction="ltr"
              >
                {row.label}
              </text>
            </g>
          );
        })}
        {/* centred anchors throughout: `end`/`start` swap meaning under the
            page's RTL direction and clip the outer labels */}
        {[0, Math.floor(dayCount / 2), dayCount - 1].map((i, k) => (
          <text
            key={k}
            x={x(i) + colW / 2}
            y={h + 12}
            fontSize={7.5}
            fill={LR_COLORS.axisText}
            textAnchor="middle"
          >
            {formatDayMonth(dayAt(i), lang)}
          </text>
        ))}
      </g>
    </svg>
  );
}
