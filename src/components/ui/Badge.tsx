import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-success border-green-200",
  warning: "bg-amber-50 text-warning border-amber-200",
  danger: "bg-red-50 text-danger border-red-200",
  neutral: "bg-gray-50 text-text-secondary border-border",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "neutral", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center
          px-2 py-0.5
          text-[12px] font-medium
          border rounded-full
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps };
