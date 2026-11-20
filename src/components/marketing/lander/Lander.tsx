import type { CSSProperties, ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { keepCodes } from "@/lib/keep-codes";
import { cn } from "@/lib/utils";

/**
 * The CertBench 3 landing-page kit. Every public page is built from the same
 * few pieces, so they all read as one product:
 *
 *   <LanderPage>            the canvas, header and footer
 *     <LanderHero>          one big line, one short line, a few labels
 *     <LanderStage>         the thing to play, lit, front and centre
 *     <LanderSection>       everything after it, each with one heading
 *
 * Act first: the hero is short and the stage comes straight after it. Labels,
 * not sentences: `specs` are a row of short facts rather than a paragraph.
 */

export function LanderPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-h-svh flex-col aurora-bg text-foreground", className)}>
      <MarketingHeader />
      <main className="flex-1 pb-8">{children}</main>
      <Footer />
    </div>
  );
}

export function LanderHero({
  eyebrow,
  title,
  sub,
  specs,
  above,
  children,
  className,
}: {
  /** A short line over the title: the exam, the code, "Free". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One short line under the title. */
  sub?: ReactNode;
  /** Short facts in a row: "8 questions", "No account", "Marked as you tap". */
  specs?: string[];
  /** Above the eyebrow: a breadcrumb. */
  above?: ReactNode;
  /** Under it all: an action, or tiles to pick from. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[34rem] w-[64rem] max-w-[200vw] -translate-x-1/2 rounded-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_17%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-4xl justify-items-center gap-5 px-5 pt-12 text-center sm:px-6 sm:pt-20">
        {above}
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="cb-display text-balance text-[2.35rem] sm:text-6xl">
          {typeof title === "string" ? keepCodes(title) : title}
        </h1>
        {sub && <p className="max-w-2xl text-balance text-lg text-muted-foreground">{sub}</p>}
        {specs && specs.length > 0 && <Specs items={specs} />}
        {children}
      </div>
    </section>
  );
}

/**
 * Short facts in a row, divided by dots. On a phone, where the row would wrap
 * and start a line with a dot, each fact is its own small chip instead.
 */
export function Specs({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 text-[13px] text-muted-foreground sm:gap-x-3 sm:gap-y-1.5 sm:text-sm",
        className
      )}
    >
      {items.map((s, i) => (
        <li
          key={s}
          className="flex items-center gap-3 rounded-full bg-foreground/[0.06] px-3 py-1 sm:bg-transparent sm:p-0"
        >
          {i > 0 && <span aria-hidden className="hidden size-1 rounded-full bg-foreground/25 sm:block" />}
          {s}
        </li>
      ))}
    </ul>
  );
}

const STAGE_WIDTH = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
} as const;

/**
 * Where the page's playable thing sits: wide, centred, with light pooling
 * under it, like the homepage's test drive.
 */
export function LanderStage({
  children,
  width = "md",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof STAGE_WIDTH;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto mt-10 w-full px-3 sm:mt-14 sm:px-6", STAGE_WIDTH[width], className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-4%] -bottom-32 top-[12%] -z-10 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_15%,transparent),color-mix(in_oklab,var(--primary)_9%,transparent)_55%,transparent)]"
      />
      {children}
    </div>
  );
}

const SECTION_WIDTH = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

/** A section after the stage: a small label, one heading, then its content. */
export function LanderSection({
  eyebrow,
  title,
  sub,
  children,
  width = "lg",
  align = "center",
  id,
  className,
  style,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  width?: keyof typeof SECTION_WIDTH;
  align?: "center" | "left";
  id?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} style={style} className={cn("mx-auto w-full px-5 pt-20 sm:px-6 sm:pt-28", SECTION_WIDTH[width], className)}>
      {(eyebrow || title || sub) && (
        <div className={cn("mb-8 grid gap-3 sm:mb-10", align === "center" ? "justify-items-center text-center" : "text-left")}>
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          )}
          {title && <h2 className="cb-display text-balance text-3xl sm:text-5xl">{title}</h2>}
          {sub && <p className="max-w-xl text-balance text-muted-foreground">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * The page's own words (what search reads and what a careful reader wants),
 * set quietly after the things to do.
 */
export function LanderProse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-2xl gap-4 px-5 pt-20 text-[15px] leading-relaxed text-muted-foreground sm:px-6 sm:pt-24 [&_strong]:font-medium [&_strong]:text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
