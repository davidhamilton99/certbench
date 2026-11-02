import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface RelatedLink {
  href: string;
  label: string;
  note: string;
}

/** Links to related free pages: useful next steps, and they spread link equity. */
export function RelatedLinks({
  links,
  title = "Keep practising — free",
}: {
  links: RelatedLink[];
  title?: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 grid gap-1.5">
        {links.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:border-muted-foreground/40"
          >
            <span>
              <span className="font-medium">{r.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{r.note}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}
