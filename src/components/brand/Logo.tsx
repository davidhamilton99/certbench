import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The CertBench mark: a route that turns toward its destination, lit blue at
 * the end — the path to exam day, at badge size. Solid ink, so it reads in
 * both themes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="28" height="28" rx="8" className="fill-foreground" />
      <path
        d="M8.5 20.5v-5.25a5 5 0 0 1 5-5h4"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-background"
      />
      <circle cx="20.25" cy="10.25" r="2.75" className="fill-primary" />
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
      className={cn("flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <LogoMark />
      <span
        className={cn(
          "text-[15px] font-semibold tracking-[-0.02em]",
          wordmark === "sm" && "hidden sm:inline"
        )}
      >
        CertBench
      </span>
    </Link>
  );
}
