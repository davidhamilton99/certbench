import { HTMLAttributes, forwardRef } from "react";

type AccentColor = "primary" | "success" | "warning" | "danger" | "urgency";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const accentStyles: Record<NonNullable<CardProps["accent"]>, string> = {
  primary: "border-l-4 border-l-primary",
  success: "border-l-4 border-l-success",
  warning: "border-l-4 border-l-warning",
  danger:  "border-l-4 border-l-danger",
  urgency: "border-l-4 border-l-danger",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ accent, padding = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-bg-surface border border-border rounded-lg
          ${accent ? accentStyles[accent] : ""}
          ${paddingStyles[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
export type { CardProps };
