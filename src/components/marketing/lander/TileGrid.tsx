import type { ReactNode } from "react";
import { IntentLink } from "@/components/marketing/IntentLink";
import { cn } from "@/lib/utils";

export interface Tile {
  href: string;
  title: ReactNode;
  /** A code set in mono before the title: "1.2". */
  code?: string;
  /** One line beside the title. */
  detail?: ReactNode;
}

/**
 * Links as ruled rows, the way a course outline lists its parts: a code where
 * there is one, the title, and one line about it. Each row is one link. A
 * group has its heading over a rule, as a domain has in the outline of the
 * study path.
 *
 * (The name is from the grid of cards this replaced. Twenty-eight objectives
 * were twenty-eight boxes; a list that is ruled needs none.)
 */
export function TileGrid({
  groups,
  details = "sm",
  headingLevel = 3,
  className,
}: {
  groups: { label?: ReactNode; tiles: Tile[] }[];
  /** Where the line about each row shows: from the `sm` width (a phone gets a compact list), or always. */
  details?: "sm" | "always";
  /** The level of a group's heading: 3 under a section's own heading, 2 where the groups are the sections. */
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("grid gap-10", className)}>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && (
            <Heading className="border-b border-foreground/70 pb-2 text-left text-small font-semibold">{g.label}</Heading>
          )}
          <ul className={cn("divide-y divide-border border-b border-border", !g.label && "border-t")}>
            {g.tiles.map((t) => (
              <li key={t.href}>
                {/* The whole row is the link; its title carries the underline,
                    which darkens when the pointer is anywhere on the row. The
                    row sets the quiet colour of the code and the detail, and
                    each part sets only its own size: a size and a colour
                    passed through one cn() call can lose the size. */}
                <IntentLink
                  href={t.href}
                  className={cn(
                    "group grid items-baseline gap-x-4 gap-y-0.5 py-3 text-left text-muted-foreground",
                    t.code && "grid-cols-[2.5rem_minmax(0,1fr)]",
                    t.code && t.detail && "sm:grid-cols-[2.5rem_minmax(0,16rem)_minmax(0,1fr)]",
                    !t.code && t.detail && "sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]"
                  )}
                >
                  {/* A space in the text between the parts: read without styles,
                      or as the link's name, the row is words and not one run. */}
                  {t.code && <span className="font-mono text-note">{t.code}</span>}{" "}
                  <span className="cb-link min-w-0 text-small font-medium group-hover:decoration-current">{t.title}</span>{" "}
                  {t.detail && (
                    <span
                      className={cn(
                        "min-w-0 text-note",
                        t.code && "col-start-2 sm:col-start-3",
                        details === "sm" && "hidden sm:block"
                      )}
                    >
                      {t.detail}
                    </span>
                  )}
                </IntentLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
