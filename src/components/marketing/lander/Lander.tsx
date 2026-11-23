import type { CSSProperties, ReactNode } from "react";
import { keepCodes } from "@/lib/keep-codes";
import { cn } from "@/lib/utils";
import { COLUMN, PAGE } from "./layout";

/**
 * The page kit. Every public page is built from the same few pieces, so they
 * all read as one publication:
 *
 *   <LanderPage>            the page (its header and footer come from the layout)
 *     <LanderHero>          what the page is, in one line, and its facts
 *     <LanderStage>         the thing to do, straight after it
 *     <LanderSection>       everything after it, each with one heading
 *     <LanderBlock>         anything else: a note, a list of links, the questions and answers
 *
 * Set like a public document. There is one left edge: the page's container is
 * the header's and the footer's, so the logo, the page's title and every
 * heading begin on the same line down the page. Text, headings and rules keep
 * to a reading column on that edge, and running text is no wider than its
 * measure (`cb-measure`). A table or a list that needs the room runs past the
 * column to the container's right edge; nothing is centred. The two widths
 * are in ./layout.ts.
 */

/**
 * The page inside the public frame. The header, the main region and the footer
 * are drawn once by src/app/(marketing)/layout.tsx.
 */
export function LanderPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 pb-8", className)}>{children}</div>;
}

/**
 * A block in the page's container, on the page's left edge: a note, a list of
 * links, the questions and answers. It keeps to the reading column unless it
 * is `wide`. `className` goes on the block itself (its spacing, its own grid).
 */
export function LanderBlock({
  children,
  wide = false,
  className,
}: {
  children: ReactNode;
  /** Let a table or a long list run to the container's right edge. */
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={PAGE}>
      <div className={cn(!wide && COLUMN, className)}>{children}</div>
    </div>
  );
}

/** One fact about the page: what it is, and its value. "Questions", "90". */
export interface Spec {
  label: string;
  value: ReactNode;
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
  /** A short line over the title that says something the title does not: the exam, the code. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One or two sentences under the title. */
  sub?: ReactNode;
  /** The page's facts, as labelled pairs. A plain string is accepted as a fact without a label. */
  specs?: (Spec | string)[];
  /** Above the eyebrow: a breadcrumb. */
  above?: ReactNode;
  /** Under it all: an action, or links to choose from. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative", className)}>
      <div className={cn(PAGE, "pt-10 sm:pt-16")}>
        <div className={cn(COLUMN, "grid grid-cols-[minmax(0,1fr)] gap-4")}>
          {above}
          {eyebrow && <p className="cb-label text-muted-foreground">{eyebrow}</p>}
          <h1 className="cb-title">{typeof title === "string" ? keepCodes(title) : title}</h1>
          {sub && <p className="cb-measure text-lede text-muted-foreground sm:text-xl">{sub}</p>}
          {specs && specs.length > 0 && <Specs items={specs} />}
          {children}
        </div>
      </div>
    </section>
  );
}

const SPEC_COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

/**
 * A page's facts as a summary list between two rules: each fact has a label
 * and a value ("Questions", "90"), and each sits in a column of its own. Two
 * columns on a phone, and from the `sm` width one equal column for each fact
 * up to four, so a fact can wrap inside its column and never falls to a row
 * by itself with a rule in front of it.
 *
 * A plain string is still accepted, as a fact without a label, for a page
 * that has not yet named its facts.
 */
export function Specs({ items, className }: { items: (Spec | string)[]; className?: string }) {
  const layout = cn(
    "mt-1 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3.5 text-left",
    SPEC_COLUMNS[Math.min(items.length, 4)],
    className
  );
  if (items.every((item): item is string => typeof item === "string")) {
    return (
      <ul className={layout}>
        {items.map((item) => (
          <li key={item} className="min-w-0 text-small text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className={layout}>
      {items.map((item) => {
        const spec = typeof item === "string" ? { label: "", value: item } : item;
        return (
          <div key={spec.label || String(spec.value)} className="min-w-0">
            {spec.label && <dt className="text-note text-muted-foreground">{spec.label}</dt>}
            <dd className="text-small font-medium">{spec.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

const STAGE_WIDTH = {
  md: COLUMN,
  lg: COLUMN,
  xl: "max-w-4xl",
} as const;

/**
 * Where the page's thing to do sits: straight under the hero and on the same
 * left edge, so the first screen is the product and not a description of it.
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
    <div className={cn(PAGE, "relative mt-8 sm:mt-10", className)}>
      <div className={STAGE_WIDTH[width]}>{children}</div>
    </div>
  );
}

/** A section after the stage: a rule, one heading, then its content. */
export function LanderSection({
  eyebrow,
  title,
  sub,
  children,
  width = "lg",
  id,
  className,
  style,
}: {
  /** A short line over the heading. Use it only for a fact the heading does not hold. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  /** `xl` lets the section (a table, a long list) run to the container's right edge. */
  width?: "md" | "lg" | "xl";
  /** Headings are set left everywhere; kept so that callers need not change. */
  align?: "center" | "left";
  id?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} style={style} className={cn(PAGE, "pt-16 sm:pt-24", className)}>
      <div className={cn(width !== "xl" && COLUMN)}>
        {(eyebrow || title || sub) && (
          <div className="mb-6 grid gap-2.5 border-t border-foreground/80 pt-5 text-left sm:mb-8">
            {eyebrow && <p className="cb-label text-muted-foreground">{eyebrow}</p>}
            {title && <h2 className={cn("cb-section", COLUMN)}>{title}</h2>}
            {sub && <p className="cb-measure text-body text-muted-foreground">{sub}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * The page's own words (what search reads and what a careful reader wants),
 * set quietly after the things to do, at the width of its measure.
 */
export function LanderProse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(PAGE, "pt-16 sm:pt-20", className)}>
      <div className="cb-measure grid gap-4 text-body text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
