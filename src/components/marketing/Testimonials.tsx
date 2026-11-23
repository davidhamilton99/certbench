export interface TestimonialItem {
  id: string;
  quote: string;
  displayName: string;
  certName: string | null;
}

/**
 * What people who reported passing said, in their words. It is rendered only when there
 * are approved stories: the page that uses it decides whether to show it. No
 * star ratings are drawn, because nobody gave one.
 */
export function Testimonials({ items }: { items: TestimonialItem[] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-6 sm:py-24">
        <h2 className="cb-section">What people who reported passing have said</h2>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="grid content-start gap-3 border-t border-foreground/80 pt-4">
              <blockquote className="font-serif text-lede">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="text-small text-muted-foreground">
                {t.displayName}
                {t.certName && <>, who reported passing {t.certName}</>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
