import type { ReadinessPoint } from "@/core/analytics/shape";

const W = 640;
const H = 180;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };

/** Pure-SVG readiness line chart (server-rendered, theme-aware via tokens). */
export function ReadinessChart({ points }: { points: ReadinessPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No readiness history yet — complete exams to build the trend.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (score: number) => PAD.top + innerH - (score / 100) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(" ");

  const gridLines = [0, 25, 50, 75, 100];
  const firstDay = points[0].day.slice(5);
  const lastDay = points[points.length - 1].day.slice(5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Readiness trend from ${points[0].day} to ${points[points.length - 1].day}`}
      className="w-full"
    >
      {gridLines.map((g) => (
        <g key={g}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(g)}
            y2={y(g)}
            className="stroke-border"
            strokeWidth="1"
          />
          <text
            x={PAD.left - 6}
            y={y(g) + 3}
            textAnchor="end"
            className="fill-muted-foreground font-mono text-[10px]"
          >
            {g}
          </text>
        </g>
      ))}
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2" />
      {points.map((p, i) => (
        <circle
          key={p.day}
          cx={x(i)}
          cy={y(p.score)}
          r="3"
          className="fill-primary"
        >
          <title>{`${p.day}: ${p.score}%`}</title>
        </circle>
      ))}
      <text
        x={PAD.left}
        y={H - 6}
        className="fill-muted-foreground font-mono text-[10px]"
      >
        {firstDay}
      </text>
      <text
        x={W - PAD.right}
        y={H - 6}
        textAnchor="end"
        className="fill-muted-foreground font-mono text-[10px]"
      >
        {lastDay}
      </text>
    </svg>
  );
}
