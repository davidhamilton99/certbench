/**
 * Emits a JSON-LD <script> for structured data (SEO + GEO — so retrieval
 * engines like ChatGPT Search and Perplexity can parse and cite the page).
 * Server component; the object is serialised at render time. Pass only
 * trusted, server-known values — JSON.stringify escapes them into the script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
