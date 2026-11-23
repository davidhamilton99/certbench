import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * CertBench 4 buttons: plain rectangles with a small corner, the way a form's
 * are. The main action is the institutional blue, the same ink as a link, so
 * what can be pressed is always one colour. On the navy band (the header,
 * `.cb-sheet`) the same variants draw in white.
 *
 * A press is answered by the button itself: it goes down a pixel at once and
 * comes back up on the release, and the change can be interrupted halfway.
 * Focus is the page's one ring, an outline (src/app/globals.css), so it is
 * drawn under a Windows contrast theme too and does not fade in on each Tab.
 * On a touch screen the default size grows to 44 pixels and the two small
 * sizes keep a 44 by 44 hit area (`cb-tap`).
 *
 * An icon beside the words trims the padding on its own side only, so the
 * words stay where they are in a button without one.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,opacity,translate] duration-150 ease-out active:duration-75 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-foreground/[0.08] disabled:text-foreground/40 disabled:opacity-100",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-foreground/25 bg-transparent font-medium hover:border-foreground/50 hover:bg-foreground/[0.04]",
        secondary:
          "bg-foreground/[0.07] font-medium text-foreground hover:bg-foreground/[0.11]",
        ghost: "font-medium hover:bg-foreground/[0.06]",
        link: "font-medium text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 px-4 pointer-coarse:h-11 has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3",
        sm: "cb-tap h-8 px-3 text-note has-[>svg:first-child]:pl-2 has-[>svg:last-child]:pr-2",
        lg: "h-12 px-6 text-base has-[>svg:first-child]:pl-[1.125rem] has-[>svg:last-child]:pr-[1.125rem]",
        icon: "cb-tap size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * A request this button started is still in flight. The button keeps its
     * width and its colour, shows the small spinner in place of its words,
     * says it is busy to a screen reader and ignores further presses.
     */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  if (asChild || !loading) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={onClick}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), "relative")}
      aria-busy
      aria-disabled
      // Not `disabled`: a disabled button loses the keyboard's place and turns
      // grey. A press, or Enter in the form's field, does nothing meanwhile.
      onClick={(event) => event.preventDefault()}
      {...props}
    >
      <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
      <Loader2 className="absolute animate-spin" aria-hidden />
    </button>
  );
}

export { Button, buttonVariants };
