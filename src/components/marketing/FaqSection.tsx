import type { CertPageFaq } from "@/lib/seo/cert-pages";

/** FAQ block with FAQPage structured data for rich results. */
export function FaqSection({ faqs }: { faqs: CertPageFaq[] }) {
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
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="mt-4 grid gap-5">
        {faqs.map((f) => (
          <div key={f.question}>
            <h3 className="font-medium">{f.question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {f.answer}
            </p>
          </div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
