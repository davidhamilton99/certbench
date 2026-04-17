import type { ReadinessPoint } from "@/lib/analytics/shape";

interface Props {
  points: ReadinessPoint[];
  /** Readiness thresholds to draw as horizontal reference lines. */
  thresholds: { label: string; value: number; tone: "success" | "warning" }[];
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

/**
 * Static SVG line chart of readiness score over time. Server-rendered —
 * no interactivity. Dot at each data point so single-snapshot spans are
 * still visible. Y axis is fixed 0–100 so visual changes map directly
 * to readiness percentage points.
 */
export function ReadinessChart({ points, thresholds }: Props) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  if (points.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[13px] text-text-muted">
        No readiness snapshots yet — take a diagnostic or practice exam.
      </div>
    );
  }

  const xStep =
    points.length > 1 ? innerW / (points.length - 1) : 0;

  const xOf = (i: number) =>
    points.length === 1 ? PADDING.left + innerW / 2 : PADDING.left + i * xStep;
  const yOf = (score: number) =>
    PADDING.top + innerH * (1 - Math.max(0, Math.min(100, score)) / 100);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.score).toFixed(1)}`)
    .join(" ");

  // Axis tick labels — first, middle, last day
  const axisIndexes = new Set<number>([0]);
  if (points.length > 2) axisIndexes.add(Math.floor(points.length / 2));
  if (points.length > 1) axisIndexes.add(points.length - 1);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-[200px]"
      role="img"
      aria-label={`Readiness score over ${points.length} day${points.length === 1 ? "" : "s"}`}
    >
      {/* Y axis gridlines at 0/25/50/75/100 */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={yOf(v)}
            y2={yOf(v)}
            className="stroke-border-light"
            strokeWidth={1}
            strokeDasharray={v === 0 ? undefined : "2 3"}
          />
          <text
            x={PADDING.left - 6}
            y={yOf(v) + 3}
            textAnchor="end"
            className="fill-text-muted font-mono"
            fontSize={10}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Threshold lines (e.g. pass = 75) */}
      {thresholds.map((t) => (
        <g key={t.label}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={yOf(t.value)}
            y2={yOf(t.value)}
            className={
              t.tone === "success" ? "stroke-success" : "stroke-warning"
            }
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
          <text
            x={WIDTH - PADDING.right - 4}
            y={yOf(t.value) - 4}
            textAnchor="end"
            className={
              t.tone === "success"
                ? "fill-success font-mono"
                : "fill-warning font-mono"
            }
            fontSize={9}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Data line */}
      <path
        d={pathD}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {points.map((p, i) => (
        <circle
          key={p.day}
          cx={xOf(i)}
          cy={yOf(p.score)}
          r={3}
          className="fill-primary"
        >
          <title>
            {p.day}: {p.score.toFixed(1)}%
          </title>
        </circle>
      ))}

      {/* X axis labels */}
      {[...axisIndexes].sort((a, b) => a - b).map((i) => (
        <text
          key={i}
          x={xOf(i)}
          y={HEIGHT - 8}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          className="fill-text-muted font-mono"
          fontSize={10}
        >
          {points[i].day.slice(5)}
        </text>
      ))}
    </svg>
  );
}
