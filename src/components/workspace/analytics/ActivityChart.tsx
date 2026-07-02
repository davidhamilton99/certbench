import type { DailyActivity } from "@/core/analytics/shape";

const W = 640;
const H = 140;
const PAD = { top: 8, right: 8, bottom: 22, left: 30 };

/** Pure-SVG daily-questions bar chart. */
export function ActivityChart({ days }: { days: DailyActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.questions));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / days.length;
  const barW = Math.max(2, step * 0.6);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Questions answered per day"
      className="w-full"
    >
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={PAD.top + innerH}
        y2={PAD.top + innerH}
        className="stroke-border"
        strokeWidth="1"
      />
      <text
        x={PAD.left - 6}
        y={PAD.top + 4}
        textAnchor="end"
        className="fill-muted-foreground font-mono text-[10px]"
      >
        {max}
      </text>
      {days.map((d, i) => {
        const h = (d.questions / max) * innerH;
        return (
          <rect
            key={d.day}
            x={PAD.left + i * step + (step - barW) / 2}
            y={PAD.top + innerH - h}
            width={barW}
            height={Math.max(d.questions > 0 ? 2 : 0, h)}
            rx="1.5"
            className={d.questions > 0 ? "fill-primary" : "fill-muted"}
          >
            <title>{`${d.day}: ${d.questions} questions, ${d.correct} correct`}</title>
          </rect>
        );
      })}
      <text
        x={PAD.left}
        y={H - 6}
        className="fill-muted-foreground font-mono text-[10px]"
      >
        {days[0]?.day.slice(5)}
      </text>
      <text
        x={W - PAD.right}
        y={H - 6}
        textAnchor="end"
        className="fill-muted-foreground font-mono text-[10px]"
      >
        {days[days.length - 1]?.day.slice(5)}
      </text>
    </svg>
  );
}
