interface ProgressBarProps {
  value: number; // 0-100
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2.5",
};

export function ProgressBar({
  value,
  size = "sm",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 bg-border-light rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        <div
          className="h-full rounded-full transition-all duration-300 bg-primary"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[13px] font-mono font-medium text-text-secondary tabular-nums">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
