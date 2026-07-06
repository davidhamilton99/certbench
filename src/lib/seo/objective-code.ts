/** URL segment ⇄ objective code ("1.2" ⇄ "1-2"). Pure, shared client+server. */
export function codeToSlug(code: string): string {
  return code.replace(/\./g, "-");
}
export function slugToCode(slug: string): string {
  return slug.replace(/-/g, ".");
}
