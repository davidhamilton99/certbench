import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  size?: "sm" | "md";
  className?: string;
}

export function ProgressBar({ value, size = "md", className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        size === "sm" ? "h-1" : "h-1.5",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
