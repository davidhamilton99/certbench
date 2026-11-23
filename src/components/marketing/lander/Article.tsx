import type { ReactNode } from "react";
import { keepCodes } from "@/lib/keep-codes";
import { cn } from "@/lib/utils";
import { COLUMN, PAGE } from "./layout";

/**
 * Reading pages (comparisons, guides, the pages about CertBench): a page
 * title with the introduction as its lede, then titled sections. They are set
 * on the page's one left edge like every other public page (see Lander.tsx):
 * headings, rules and text keep to the reading column, running text is no
 * wider than its measure, and a table may run to the container's right edge.
 * Pages that lead with something to do use LanderHero instead.
 */
export function ArticleBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(PAGE, "pt-12 sm:pt-20", className)}>{children}</div>;
}

export function ArticleHero({
  eyebrow,
  title,
  above,
  children,
  className,
}: {
  /** A short line over the title: "Comparison", "For educators". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Above the eyebrow: a breadcrumb, or the date the page was checked. */
  above?: ReactNode;
  /** The introduction. Its first paragraph is set as the lede. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(COLUMN, className)}>
      {above && <div className="mb-5">{above}</div>}
      {eyebrow && <p className="cb-label text-muted-foreground">{eyebrow}</p>}
      <h1 className={cn("cb-title", eyebrow ? "mt-3" : "")}>{typeof title === "string" ? keepCodes(title) : title}</h1>
      {children && (
        <div className="cb-measure mt-6 grid gap-4 text-body text-muted-foreground sm:mt-8 [&>p:first-child]:text-lede [&>p:first-child]:text-foreground/85 sm:[&>p:first-child]:text-xl [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </div>
      )}
    </header>
  );
}

/** A titled section of a reading page: a rule, its heading, then its content. */
export function ArticleSection({
  title,
  sub,
  children,
  wide = false,
  id,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  /** Let the section (a table) run to the container's right edge. */
  wide?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mt-16 sm:mt-24", !wide && COLUMN, className)}>
      {(title || sub) && (
        <div className="mb-6 grid gap-2 border-t border-foreground/80 pt-5 sm:mb-8">
          {title && (
            <h2 className={cn("cb-subsection", COLUMN)}>{typeof title === "string" ? keepCodes(title) : title}</h2>
          )}
          {sub && <p className="cb-measure text-body text-muted-foreground">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A statement and what stands behind it, as a ruled row of a `dl`: the term
 * at the left, and the explanation beside it at the width of its measure.
 */
export function ArticleRow({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-border py-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8">
      <dt className="text-body font-semibold">{term}</dt>
      <dd className="cb-measure grid gap-3 text-body text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </dd>
    </div>
  );
}

/** A tick in a small cell, like a mark on an answer sheet: inked for the page's own side, quiet otherwise. */
export function TickWell({ lit = false, children }: { lit?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-xs border [&_svg]:size-3",
        lit ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25 text-foreground/65"
      )}
    >
      {children}
    </span>
  );
}

/**
 * A page's closing call to action: the navy band, with one heading and then
 * the page's own sentence, button and links as children (the band draws them
 * in white). It is set left on the page's edge like everything else, and it
 * runs the full width of whatever holds it: placed straight inside the page,
 * as the last thing or between two parts of it, it is a band from one side of
 * the window to the other, as the header is.
 *
 * It keeps a space above itself. Where it follows a section that already ends
 * in its own space, pass `className="mt-0 sm:mt-0"`.
 */
export function CtaBand({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("cb-sheet mt-16 sm:mt-24", className)}>
      <div className={cn(PAGE, "grid justify-items-start gap-4 py-12 text-left sm:py-16")}>
        <h2 className={cn("cb-subsection", COLUMN)}>{typeof title === "string" ? keepCodes(title) : title}</h2>
        {children}
      </div>
    </section>
  );
}
