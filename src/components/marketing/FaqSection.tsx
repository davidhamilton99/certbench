import { Plus } from "lucide-react";
import type { CertPageFaq } from "@/lib/seo/cert-pages";
import { JsonLd } from "@/components/seo/JsonLd";
import { keepCodes } from "@/lib/keep-codes";
import { cn } from "@/lib/utils";

/**
 * Frequently asked questions as a list, each answer folded under its
 * question, so the list can be scanned. Every answer is still in the page,
 * and in the FAQPage structured data that search and AI answers read.
 */
export function FaqSection({ faqs, className }: { faqs: CertPageFaq[]; className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className={cn("mt-16 sm:mt-24", className)}>
      <h2 className="cb-subsection border-t border-foreground/80 pt-5">Frequently asked questions</h2>
      <div className="mt-6 border-t border-border">
        {faqs.map((f) => (
          <details key={f.question} className="group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="text-body font-medium group-hover:text-primary">{keepCodes(f.question)}</h3>
              <Plus
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary group-open:rotate-45"
              />
            </summary>
            {/* An exam code is kept whole where a line could end inside it. */}
            <p className="cb-measure pb-5 text-body text-muted-foreground">{keepCodes(f.answer)}</p>
          </details>
        ))}
      </div>
      <JsonLd data={jsonLd} />
    </section>
  );
}
