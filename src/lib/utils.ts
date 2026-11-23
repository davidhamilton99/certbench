import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The class merger, told about the site's own text sizes. `text-note`,
 * `text-small`, `text-body` and `text-lede` are sizes (src/app/globals.css),
 * but a merger that has not been told so takes any unknown `text-*` class for
 * a colour: `cn("text-small", "text-muted-foreground")` then kept the colour
 * and silently dropped the size.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["note", "small", "body", "lede"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
