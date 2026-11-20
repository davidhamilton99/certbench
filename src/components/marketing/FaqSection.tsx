import { Plus } from "lucide-react";
import type { CertPageFaq } from "@/lib/seo/cert-pages";
import { JsonLd } from "@/components/seo/JsonLd";
import { cn } from "@/lib/utils";

/**
 * FAQ as a list of questions, each answer folded under its question: easy to
 * scan, nothing to wade through. Every answer is still in the page, and in the
 * FAQPage structured data for rich results and LLM citation.
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
    <section className={cn("mt-14", className)}>
      <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Frequently asked questions</h2>
      <div className="mt-5 border-t border-border/70">
        {faqs.map((f) => (
          <details key={f.question} className="group border-b border-border/70">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15px] font-medium leading-snug">{f.question}</h3>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground transition-colors group-hover:text-foreground group-open:bg-foreground group-open:text-background">
                <Plus aria-hidden className="size-3.5 transition-transform duration-200 group-open:rotate-45" />
              </span>
            </summary>
            <p className="pb-5 pr-10 text-[15px] leading-relaxed text-muted-foreground">{f.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd data={jsonLd} />
    </section>
  );
}
