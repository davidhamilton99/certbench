import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** How far along, from 0 to 100. */
  value: number;
  size?: "sm" | "md" | "lg";
  /**
   * What the bar measures, in words, for a screen reader: "Questions answered".
   * Leave it out where the same figure is printed beside the bar ("12 of 90
   * answered"): the bar is then a drawing of that sentence and is hidden from
   * assistive technology, so the figure is not read twice.
   */
  label?: string;
  /** Drawn once and left: no transition. */
  still?: boolean;
  className?: string;
}

const HEIGHT = { sm: "h-1", md: "h-1.5", lg: "h-2" } as const;

/**
 * How far along: the one bar for progress through questions, steps and time.
 * A score against the readiness target is a different drawing (ScoreBar in
 * components/instrument/ScoreLevel.tsx).
 *
 * It is a rule drawn thick: square ends, one colour, a quiet track. The fill
 * is the full width and is moved by a transform, which the browser can do
 * without laying the page out again; a changing width cannot.
 */
export function ProgressBar({ value, size = "md", label, still = false, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const a11y = label
    ? ({
        role: "progressbar",
        "aria-label": label,
        "aria-valuenow": Math.round(clamped),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
      } as const)
    : ({ "aria-hidden": true } as const);
  return (
    <div
      {...a11y}
      className={cn("w-full overflow-hidden rounded-xs bg-foreground/[0.09]", HEIGHT[size], className)}
    >
      <div
        className={cn(
          "h-full w-full origin-left bg-primary",
          !still && "transition-transform duration-300 ease-out"
        )}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
