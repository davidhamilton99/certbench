import { HTMLAttributes, forwardRef } from "react";

type AccentColor = "primary" | "success" | "warning" | "danger" | "urgency";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor;
  padding?: "sm" | "md" | "lg";
}

const accentStyles: Record<AccentColor, string> = {
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
  urgency: "border-l-urgency",
};

const paddingStyles = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ accent, padding = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-bg-surface border border-border rounded-lg
          ${accent ? `border-l-4 ${accentStyles[accent]}` : ""}
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
