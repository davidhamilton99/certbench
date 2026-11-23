/**
 * Emits a JSON-LD <script> for structured data (SEO and GEO, so retrieval
 * engines like ChatGPT Search and Perplexity can parse and cite the page).
 * Server component; the object is serialized at render time.
 *
 * JSON.stringify makes valid JSON, which is not the same as text that is safe
 * inside a script element: a value that held "</script>" would end the element
 * and the rest would be read as markup. Every "<" is therefore written as its
 * JSON escape, which a JSON parser reads back as the same character. Callers
 * pass the site's own constants today; this keeps the component safe if a
 * value from a member ever reaches it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(data) }} />;
}

/** The backslash, named by its code so that no escape sequence is written out in this file. */
const BACKSLASH = String.fromCharCode(92);

/** `data` as JSON with every less-than sign escaped, safe to place inside a script element. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, `${BACKSLASH}u003c`);
}
