import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { cn } from "@/lib/utils";

export interface RelatedLink {
  href: string;
  label: string;
  note: string;
}

/** Links to related free pages, as ruled rows: the page's name, and one line about it. */
export function RelatedLinks({
  links,
  title = "More free practice",
  className,
}: {
  links: RelatedLink[];
  title?: string;
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className={cn("mt-16 sm:mt-24", className)}>
      <h2 className="cb-subsection border-t border-foreground/80 pt-5">{title}</h2>
      <TileGrid
        className="mt-6"
        groups={[{ tiles: links.map((r) => ({ href: r.href, title: r.label, detail: r.note })) }]}
      />
    </section>
  );
}
