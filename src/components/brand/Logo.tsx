import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The CertBench mark: a bench mark, the sign a surveyor cuts into stone to fix
 * a known height. A level bar, and a broad arrow pointing up to it. Here the
 * bar is the pass mark and the arrow is you. Drawn in the current ink, so it
 * reads on paper, on the blue sheet and in both themes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7 shrink-0", className)} fill="none" stroke="currentColor">
      <path d="M3.5 6.6h21" strokeWidth="2.8" />
      <path d="M14 8.6v14.2M14 8.6 7.55 21.25M14 8.6l6.45 12.65" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

/** The mark and the wordmark, linking home. */
export function Logo({
  href = "/",
  wordmark = "always",
  className,
}: {
  href?: string;
  /** "sm": the word only from the sm breakpoint up (crowded phone headers). */
  wordmark?: "always" | "sm";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="CertBench home"
      className={cn("cb-tap flex shrink-0 items-center gap-2 rounded-md", className)}
    >
      <LogoMark className="size-[1.625rem]" />
      <span
        className={cn(
          // Below 380px (a small phone, or a page at 400%) there is no room for
          // the word beside the header's buttons: the mark stands for it, and
          // the link keeps its name.
          "font-serif text-[1.1875rem] font-semibold leading-none tracking-[-0.01em] max-[379px]:hidden",
          wordmark === "sm" && "hidden sm:inline"
        )}
      >
        CertBench
      </span>
    </Link>
  );
}
