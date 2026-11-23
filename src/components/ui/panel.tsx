import * as React from "react";
import { cn } from "@/lib/utils";

type AccentColor = "primary" | "success" | "warning" | "danger" | "urgency";

// A ruled edge is square at both ends: on a rounded corner it would curl into
// a hook, so the panel's left corners are straight where it has one.
const ACCENT_STYLES: Record<AccentColor, string> = {
  primary: "rounded-l-none border-l-4 border-l-primary",
  success: "rounded-l-none border-l-4 border-l-success",
  warning: "rounded-l-none border-l-4 border-l-warning",
  danger: "rounded-l-none border-l-4 border-l-danger",
  urgency: "rounded-l-none border-l-4 border-l-danger",
};

const PADDING_STYLES = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor;
  padding?: keyof typeof PADDING_STYLES;
}

/**
 * Simple padded surface with an optional accent stripe — the shape the
 * ported PBQ players expect (single-element card, unlike the slotted
 * shadcn Card).
 */
export function Panel({
  accent,
  padding = "md",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground",
        PADDING_STYLES[padding],
        accent && ACCENT_STYLES[accent],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
