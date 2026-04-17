import type { DailyActivity } from "@/lib/analytics/shape";

interface Props {
  days: DailyActivity[];
}

const WIDTH = 640;
const HEIGHT = 140;
const PADDING = { top: 12, right: 16, bottom: 24, left: 36 };

/**
 * Bar chart of questions answered per day. Bars are stacked conceptually
 * as total-height with a correct-portion overlay, so the user sees both
 * volume and accuracy at a glance.
 */
export function ActivityChart({ days }: Props) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxQuestions = Math.max(1, ...days.map((d) => d.questions));
  const barW = innerW / days.length;

  const yOf = (v: number) => PADDING.top + innerH * (1 - v / maxQuestions);

  // Y axis tick values: 0 and maxQuestions, plus a middle if useful
  const yTicks = [0, Math.round(maxQuestions / 2), maxQuestions].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  if (days.every((d) => d.questions === 0)) {
    return (
      <div className="h-[140px] flex items-center justify-center text-[13px] text-text-muted">
        No completed exams in this range yet.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-[140px]"
      role="img"
      aria-label={`Questions answered per day over ${days.length} days`}
    >
      {/* Y ticks */}
      {yTicks.map((v) => (
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

      {/* Bars */}
      {days.map((d, i) => {
        const x = PADDING.left + i * barW;
        const barPad = Math.max(1, barW * 0.15);
        const w = Math.max(1, barW - barPad);
        const totalH = d.questions === 0 ? 0 : innerH * (d.questions / maxQuestions);
        const correctH =
          d.questions === 0 ? 0 : innerH * (d.correct / maxQuestions);
        return (
          <g key={d.day}>
            {/* Total (incorrect portion shows as muted fill under the correct overlay) */}
            <rect
              x={x}
              y={PADDING.top + innerH - totalH}
              width={w}
              height={totalH}
              className="fill-border"
            >
              <title>
                {d.day}: {d.questions} questions ({d.correct} correct,{" "}
                {d.attempts} exam{d.attempts === 1 ? "" : "s"})
              </title>
            </rect>
            {/* Correct overlay */}
            <rect
              x={x}
              y={PADDING.top + innerH - correctH}
              width={w}
              height={correctH}
              className="fill-primary"
            />
          </g>
        );
      })}

      {/* Edge x labels */}
      <text
        x={PADDING.left}
        y={HEIGHT - 6}
        className="fill-text-muted font-mono"
        fontSize={10}
        textAnchor="start"
      >
        {days[0]?.day.slice(5)}
      </text>
      <text
        x={WIDTH - PADDING.right}
        y={HEIGHT - 6}
        className="fill-text-muted font-mono"
        fontSize={10}
        textAnchor="end"
      >
        {days[days.length - 1]?.day.slice(5)}
      </text>
    </svg>
  );
}
