import type { ReactElement } from "react";

/**
 * SVG icons recreated from the printed LibreView reports, replacing the
 * emoji placeholders. Each *Art component draws inside a 16×16 box so the
 * same artwork can be reused inline (via <Icon…>) and inside charts
 * (via <Glyph…>, anchored at bottom-centre like an SVG text glyph).
 */

export const ICON_BLUE = "#1d70b7";
const ICON_NAVY = "#17557f";
const ICON_RED = "#e02020";
const APPLE_YELLOW = "#f2a71b";
const LEAF_GREEN = "#3f9c35";
const RAPID_GREEN = "#8dc63f";
const LONG_GREEN = "#3f9c35";

function Svg({
  children,
  label,
  className,
}: {
  children: ReactElement | ReactElement[];
  label?: string;
  className?: string;
}): ReactElement {
  return (
    <svg
      className={"lr-icon" + (className ? ` ${className}` : "")}
      viewBox="0 0 16 16"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

/* ---------------- artwork (16×16 space) ---------------- */

/** Sensor/reader device: blue rounded body with screen and home dot. */
export function SensorArt(): ReactElement {
  return (
    <g>
      <rect
        x="4.6"
        y="1.4"
        width="6.8"
        height="13.2"
        rx="1.7"
        fill="none"
        stroke={ICON_BLUE}
        strokeWidth="1.4"
      />
      <rect x="6.3" y="3.4" width="3.4" height="5.8" rx="0.5" fill={ICON_BLUE} />
      <circle cx="8" cy="11.9" r="1" fill={ICON_BLUE} />
    </g>
  );
}

/** Scan/views: tilted wifi fan, as in the printed legends. */
export function ScanArt(): ReactElement {
  return (
    <g transform="rotate(-45 8 8)" fill="none">
      <circle cx="8" cy="12.1" r="1.2" fill={ICON_BLUE} stroke="none" />
      <path
        d="M5.5 9.6a3.6 3.6 0 0 1 5 0"
        stroke={ICON_BLUE}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M3.3 7.3a6.8 6.8 0 0 1 9.4 0"
        stroke={ICON_BLUE}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Low-glucose event: red boxed arrow dropping onto a floor line. */
export function LowEventArt(): ReactElement {
  return (
    <g>
      <rect
        x="1.2"
        y="1.2"
        width="13.6"
        height="13.6"
        rx="1.6"
        fill="#fff"
        stroke={ICON_RED}
        strokeWidth="1.2"
      />
      <g stroke={ICON_RED} strokeWidth="1.3" strokeLinecap="round" fill="none">
        <line x1="8" y1="3.6" x2="8" y2="9.4" />
        <path d="M5.4 7.2 8 9.9l2.6-2.7" strokeLinejoin="round" />
        <line x1="4.4" y1="12.2" x2="11.6" y2="12.2" />
      </g>
    </g>
  );
}

/** Apple with leaf (carbs / logged food). */
export function AppleArt(): ReactElement {
  return (
    <g>
      <path
        fill={APPLE_YELLOW}
        d="M11.4 4.9c-1.1-.6-2.4-.4-3.4.4-1-.8-2.3-1-3.4-.4-1.9 1-2.5 3.5-1.4 6 .9 2 2.3 3.4 3.5 3.4.5 0 .9-.3 1.3-.3s.8.3 1.3.3c1.2 0 2.6-1.4 3.5-3.4 1.1-2.5.5-5-1.4-6z"
      />
      <path
        fill={LEAF_GREEN}
        d="M8.4 4.3c.1-1.7 1.3-2.9 3.1-3-.1 1.8-1.3 3-3.1 3z"
      />
    </g>
  );
}

/** Diagonal syringe; rapid = light green, long = dark green with depot dot. */
export function SyringeArt({ variant = "rapid" }: { variant?: "rapid" | "long" }): ReactElement {
  const color = variant === "long" ? LONG_GREEN : RAPID_GREEN;
  return (
    <g transform="rotate(45 8 8)">
      {/* plunger */}
      <rect x="7.35" y="0.6" width="1.3" height="2.2" fill={color} />
      <line x1="5.8" y1="2.9" x2="10.2" y2="2.9" stroke={color} strokeWidth="1.1" />
      {/* barrel */}
      <rect x="6.1" y="3.4" width="3.8" height="6.2" rx="0.7" fill={color} />
      {/* needle */}
      <line x1="8" y1="9.6" x2="8" y2="13.6" stroke={color} strokeWidth="1" />
      {variant === "long" ? <circle cx="8" cy="14.2" r="1.1" fill={ICON_NAVY} /> : null}
    </g>
  );
}

/** Glucose drop. */
export function DropArt(): ReactElement {
  return (
    <path
      fill={ICON_NAVY}
      d="M8 1.6C5.8 4.8 4 7.5 4 9.9a4 4 0 0 0 8 0c0-2.4-1.8-5.1-4-8.3z"
    />
  );
}

/** Clock (time change). */
export function ClockArt(): ReactElement {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.7" />
      <path d="M8 4.8V8l2.4 1.7" />
    </g>
  );
}

/* Meal-period headers: sun-behind-cloud, sun, setting sun, crescent moon. */

const SKY_BLUE = "#4a8fc7";

function sunRays(cx: number, cy: number, r1: number, r2: number): ReactElement {
  return (
    <g stroke={SKY_BLUE} strokeWidth="1.1" strokeLinecap="round">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cy + Math.sin(a) * r2}
          />
        );
      })}
    </g>
  );
}

export function MorningArt(): ReactElement {
  return (
    <g>
      <circle cx="10.2" cy="5.8" r="2.4" fill={SKY_BLUE} />
      {sunRays(10.2, 5.8, 3.3, 4.4)}
      <path
        d="M2.4 12.6a2.6 2.6 0 0 1 .5-5.1 3.4 3.4 0 0 1 6.5.9 2.1 2.1 0 0 1-.3 4.2z"
        fill="#fff"
        stroke={SKY_BLUE}
        strokeWidth="1.1"
      />
    </g>
  );
}

export function MiddayArt(): ReactElement {
  return (
    <g>
      <circle cx="8" cy="8" r="3" fill={SKY_BLUE} />
      {sunRays(8, 8, 4, 5.6)}
    </g>
  );
}

export function EveningArt(): ReactElement {
  return (
    <g>
      <path d="M4.4 10.4a3.6 3.6 0 0 1 7.2 0z" fill={SKY_BLUE} />
      {sunRays(8, 10.4, 4.4, 5.6)}
      <line
        x1="1.6"
        y1="12.6"
        x2="14.4"
        y2="12.6"
        stroke={SKY_BLUE}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function NightArt(): ReactElement {
  return (
    <path
      fill={ICON_NAVY}
      d="M10.7 2.1a6.4 6.4 0 1 0 3.6 9.3A5.3 5.3 0 0 1 10.7 2.1z"
    />
  );
}

/* ---------------- inline (HTML) icons ---------------- */

export function SensorIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><SensorArt /></Svg>;
}
export function ScanIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><ScanArt /></Svg>;
}
export function LowEventIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><LowEventArt /></Svg>;
}
export function AppleIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><AppleArt /></Svg>;
}
export function RapidInsulinIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><SyringeArt variant="rapid" /></Svg>;
}
export function LongInsulinIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><SyringeArt variant="long" /></Svg>;
}
export function DropIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><DropArt /></Svg>;
}
export function ClockIcon({ label }: { label?: string }): ReactElement {
  return <Svg label={label}><ClockArt /></Svg>;
}
export function MealPeriodIcon({
  period,
  label,
}: {
  period: "morning" | "midday" | "evening" | "night";
  label?: string;
}): ReactElement {
  return (
    <Svg label={label}>
      {period === "morning" ? (
        <MorningArt />
      ) : period === "midday" ? (
        <MiddayArt />
      ) : period === "evening" ? (
        <EveningArt />
      ) : (
        <NightArt />
      )}
    </Svg>
  );
}

/* ---------------- chart glyphs (inside an <svg>) ---------------- */

/**
 * Wraps 16×16 artwork so its bottom-centre sits at (x, y) — the same
 * anchor an SVG <text textAnchor="middle"> glyph would have.
 */
function Glyph({
  x,
  y,
  size,
  children,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactElement;
}): ReactElement {
  const s = size / 16;
  return <g transform={`translate(${x - size / 2},${y - size}) scale(${s})`}>{children}</g>;
}

export function GlyphApple({ x, y, size = 9 }: { x: number; y: number; size?: number }): ReactElement {
  return <Glyph x={x} y={y} size={size}><AppleArt /></Glyph>;
}

export function GlyphSyringe({
  x,
  y,
  size = 9,
  variant = "rapid",
}: {
  x: number;
  y: number;
  size?: number;
  variant?: "rapid" | "long";
}): ReactElement {
  return <Glyph x={x} y={y} size={size}><SyringeArt variant={variant} /></Glyph>;
}
