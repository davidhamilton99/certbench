import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { cn } from "@/lib/utils";

export interface RelatedLink {
  href: string;
  label: string;
  note: string;
}

/** Links to related free pages, as tiles: useful next steps, and they spread link equity. */
export function RelatedLinks({
  links,
  title = "Keep practising — free",
  className,
}: {
  links: RelatedLink[];
  title?: string;
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className={cn("mt-14", className)}>
      <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{title}</h2>
      <TileGrid
        className="mt-5"
        columns={2}
        groups={[{ tiles: links.map((r) => ({ href: r.href, title: r.label, detail: r.note })) }]}
      />
    </section>
  );
}
