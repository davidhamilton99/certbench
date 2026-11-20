import type { ReactNode } from "react";
import { keepCodes } from "@/lib/keep-codes";
import { cn } from "@/lib/utils";

/**
 * Reading pages (comparisons, roundups, exam guides) on the CertBench 3
 * canvas: a left-set display headline with the intro as its lede, then
 * sections in one comfortable reading column. Pages that lead with something
 * to play use LanderHero instead.
 */
export function ArticleBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-3xl px-5 pt-12 sm:px-6 sm:pt-20", className)}>{children}</div>;
}

export function ArticleHero({
  eyebrow,
  title,
  above,
  children,
  className,
}: {
  /** A short line over the title: "Comparison", "CompTIA Security+ · SY0-801". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Above the eyebrow: a breadcrumb. */
  above?: ReactNode;
  /** The intro paragraphs; the first is set as the lede. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative isolate", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-48 -top-72 -z-10 h-[34rem] w-[58rem] max-w-[200vw] rounded-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
      />
      {above && <div className="mb-5">{above}</div>}
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      )}
      <h1 className={cn("cb-display text-balance text-[2.35rem] sm:text-[3.5rem]", eyebrow ? "mt-4" : "")}>
        {typeof title === "string" ? keepCodes(title) : title}
      </h1>
      {children && (
        <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted-foreground sm:mt-8 [&>p:first-child]:text-lg [&>p:first-child]:text-foreground/85 sm:[&>p:first-child]:text-xl [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </div>
      )}
    </header>
  );
}

/** A titled section in the reading column. */
export function ArticleSection({
  title,
  sub,
  children,
  id,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mt-16 sm:mt-24", className)}>
      {(title || sub) && (
        <div className="mb-6 grid gap-2 sm:mb-8">
          {title && (
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">
              {typeof title === "string" ? keepCodes(title) : title}
            </h2>
          )}
          {sub && <p className="text-muted-foreground">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A tick in a small round well: lit for the page's own side, quiet otherwise. */
export function TickWell({ lit = false, children }: { lit?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3",
        lit ? "bg-primary/15 text-primary" : "bg-foreground/[0.07] text-foreground/65"
      )}
    >
      {children}
    </span>
  );
}

/** The wide band a reading page's call to action sits in, between the column and its links. */
export function ArticleBand({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-5xl px-3 pt-20 sm:px-6 sm:pt-28", className)}>{children}</div>;
}

/** The reading column again after a band: links, FAQ. */
export function ArticleTail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-3xl px-5 sm:px-6", className)}>{children}</div>;
}

/**
 * A reading page's call to action, set like PathCard: a lit panel, a big line,
 * then the page's own buttons and links as children.
 */
export function CtaBand({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "glass relative isolate mt-16 grid justify-items-center gap-4 overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:mt-20 sm:px-12 sm:py-14",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[-60%] -z-10 h-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_24%,transparent),transparent)]"
      />
      <h2 className="cb-display text-balance text-[2rem] sm:text-[2.75rem]">
        {typeof title === "string" ? keepCodes(title) : title}
      </h2>
      {children}
    </section>
  );
}
