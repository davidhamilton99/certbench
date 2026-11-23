import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A field. Its edge is the darker `--input` rule, so it is found by its outline
 * alone. Focus is the page's one ring (an outline, src/app/globals.css) with
 * the edge turning to the same ink. A field in error keeps a red edge. Text is
 * 16px on a phone, so the browser does not zoom the page when the field takes
 * focus, and the field is 44 pixels tall on a touch screen.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-small pointer-coarse:h-11",
        "focus-visible:border-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
