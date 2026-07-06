import { Star } from "lucide-react";

export interface TestimonialItem {
  id: string;
  quote: string;
  displayName: string;
  certName: string | null;
}

/**
 * Social-proof wall for the marketing pages. Rendered only when there are
 * approved stories — the parent decides whether to show it.
 */
export function Testimonials({ items }: { items: TestimonialItem[] }) {
  return (
    <section className="border-t bg-muted/40">
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Passed, in their words
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.id}
              className="grid content-start gap-3 rounded-xl border bg-card p-6"
            >
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="text-xs text-muted-foreground">
                — {t.displayName}
                {t.certName && <> · passed {t.certName}</>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
