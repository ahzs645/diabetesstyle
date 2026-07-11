import type { ReactElement } from "react";
import type { GlucoseReading } from "../../lib/libre-report/types";
import { minutesOfDay } from "../../lib/libre-report/stats";

/**
 * LibreView report palette. These are the clinically standardized
 * time-in-range colours from the international CGM consensus plus the
 * report's AGP blues — kept faithful to the printed source.
 */
export const LR_COLORS = {
  veryHigh: "#f7a35c",
  high: "#ffd400",
  target: "#37b04b",
  low: "#e02020",
  veryLow: "#8b1a10",
  median: "#16559c",
  band2575: "#8aaed6",
  band595: "#c9d8ec",
  dayLine: "#1d63a8",
  scanDot: "#1d63a8",
  targetBand: "#e4e4e4",
  targetLine: "#4faa4f",
  gridLine: "#d9d9d9",
  axisText: "#666666",
  aboveFill: "#ffd400",
  belowFill: "#e02020",
  headerBlue: "#2e8bc8",
  ink: "#222222",
} as const;

export const DAY_MIN = 24 * 60;

/** X position (px) for a minutes-of-day value. */
export function xForMinutes(min: number, width: number): number {
  return (min / DAY_MIN) * width;
}

/** Y position (px) for a glucose value on a 0..yMax scale. */
export function yForGlucose(v: number, yMax: number, height: number): number {
  const clamped = Math.max(0, Math.min(yMax, v));
  return height - (clamped / yMax) * height;
}

/**
 * SVG path segments for a day's historic curve, breaking the line where
 * consecutive readings are more than `gapMin` minutes apart (sensor gaps
 * appear as gaps, exactly like the printed report).
 */
export function dayCurvePath(
  readings: GlucoseReading[],
  width: number,
  height: number,
  yMax: number,
  gapMin = 45,
): string {
  let d = "";
  let prev: GlucoseReading | null = null;
  for (const r of readings) {
    const x = xForMinutes(minutesOfDay(r.time), width);
    const y = yForGlucose(r.mgdl, yMax, height);
    const isGap =
      !prev || r.time.getTime() - prev.time.getTime() > gapMin * 60000;
    d += `${isGap ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    prev = r;
  }
  return d;
}

/** Closed area path between two series of equal length (band fill). */
export function bandPath(
  xs: number[],
  yTop: number[],
  yBottom: number[],
): string {
  if (xs.length === 0) return "";
  let d = `M${xs[0].toFixed(1)},${yTop[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    d += `L${xs[i].toFixed(1)},${yTop[i].toFixed(1)}`;
  }
  for (let i = xs.length - 1; i >= 0; i--) {
    d += `L${xs[i].toFixed(1)},${yBottom[i].toFixed(1)}`;
  }
  return d + "Z";
}

export function linePath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    d += `L${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

export function hourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

/** Vertical hour gridlines + labels for a 24h chart. */
export function TimeGrid({
  width,
  height,
  stepHours = 3,
  labels = true,
  labelY,
}: {
  width: number;
  height: number;
  stepHours?: number;
  labels?: boolean;
  labelY?: number;
}): ReactElement {
  const lines = [];
  for (let h = 0; h <= 24; h += stepHours) {
    const x = xForMinutes(h * 60, width);
    lines.push(
      <g key={h}>
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke={LR_COLORS.gridLine}
          strokeWidth={0.7}
          strokeDasharray={h % 12 === 0 ? undefined : "2,3"}
        />
        {labels ? (
          <text
            x={x}
            y={labelY ?? height + 11}
            fontSize={7.5}
            fill={LR_COLORS.axisText}
            textAnchor="middle"
            direction="ltr"
          >
            {hourLabel(h)}
          </text>
        ) : null}
      </g>,
    );
  }
  return <g>{lines}</g>;
}

/** Horizontal reference lines for the target range (70/180 by default). */
export function TargetLines({
  width,
  height,
  yMax,
  low,
  high,
  color = LR_COLORS.targetLine,
  band = false,
}: {
  width: number;
  height: number;
  yMax: number;
  low: number;
  high: number;
  color?: string;
  band?: boolean;
}): ReactElement {
  const yLow = yForGlucose(low, yMax, height);
  const yHigh = yForGlucose(high, yMax, height);
  return (
    <g>
      {band ? (
        <rect
          x={0}
          y={yHigh}
          width={width}
          height={yLow - yHigh}
          fill={LR_COLORS.targetBand}
        />
      ) : null}
      <line x1={0} y1={yHigh} x2={width} y2={yHigh} stroke={color} strokeWidth={1.1} />
      <line x1={0} y1={yLow} x2={width} y2={yLow} stroke={color} strokeWidth={1.1} />
    </g>
  );
}

/** Left-side glucose tick labels (drawn outside the plot, LTR digits). */
export function GlucoseTicks({
  ticks,
  yMax,
  height,
  x,
  bold = [],
}: {
  ticks: number[];
  yMax: number;
  height: number;
  x: number;
  bold?: number[];
}): ReactElement {
  return (
    <g>
      {ticks.map((tick) => (
        <text
          key={tick}
          x={x}
          y={yForGlucose(tick, yMax, height) + 2.5}
          fontSize={7.5}
          fontWeight={bold.includes(tick) ? 700 : 400}
          fill={bold.includes(tick) ? LR_COLORS.ink : LR_COLORS.axisText}
          textAnchor="end"
          direction="ltr"
        >
          {tick}
        </text>
      ))}
    </g>
  );
}

/**
 * Spread label positions so adjacent labels keep at least `minGap` px,
 * staying within [min, max]. Input order must be top-to-bottom.
 */
export function spreadPositions(
  positions: number[],
  minGap: number,
  min: number,
  max: number,
): number[] {
  const out = [...positions];
  for (let i = 1; i < out.length; i++) {
    if (out[i] < out[i - 1] + minGap) out[i] = out[i - 1] + minGap;
  }
  // pull back inside the bottom bound
  if (out.length && out[out.length - 1] > max) {
    out[out.length - 1] = max;
    for (let i = out.length - 2; i >= 0; i--) {
      if (out[i] > out[i + 1] - minGap) out[i] = out[i + 1] - minGap;
    }
  }
  if (out.length && out[0] < min) {
    out[0] = min;
    for (let i = 1; i < out.length; i++) {
      if (out[i] < out[i - 1] + minGap) out[i] = out[i - 1] + minGap;
    }
  }
  return out;
}

/** Hollow scan-reading marker. */
export function ScanDot({ cx, cy }: { cx: number; cy: number }): ReactElement {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={2.1}
      fill="#ffffff"
      stroke={LR_COLORS.scanDot}
      strokeWidth={1}
    />
  );
}
