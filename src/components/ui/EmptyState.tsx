import { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-[18px] font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-[15px] text-text-secondary max-w-md mb-6">
        {description}
      </p>
      {actionLabel &&
        (actionHref ? (
          <a href={actionHref}>
            <Button>{actionLabel}</Button>
          </a>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        ))}
    </div>
  );
}
