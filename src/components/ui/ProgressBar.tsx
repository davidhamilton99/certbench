interface ProgressBarProps {
  value: number; // 0-100
  color?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const colorStyles = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2.5",
};

function getAutoColor(value: number): "success" | "warning" | "danger" {
  if (value >= 75) return "success";
  if (value >= 40) return "warning";
  return "danger";
}

export function ProgressBar({
  value,
  color,
  size = "sm",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const resolvedColor = color || getAutoColor(clampedValue);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 bg-border-light rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorStyles[resolvedColor]}`}
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
