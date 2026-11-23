/**
 * The day the words of /about and /educators last changed, in ISO form. Both
 * pages print it ("This page was last updated on ...") and the sitemap gives it
 * as their lastmod, so a reader and a crawler are told the same day. Change it
 * in the commit that changes either page's words, and only then.
 */
export const ABOUT_PAGES_UPDATED_ISO = "2026-11-23";

/**
 * The day the words of /pricing last changed, in ISO form. The page prints it
 * ("This page was last updated on ..."), and it is the date that the sitemap
 * is to give as the page's lastmod (src/app/sitemap.ts), so that a reader and
 * a crawler are told the same day. It is a date of the page's own: a plan or a
 * price can change on a day when no other page does. Change it in the commit
 * that changes the page's words, or a figure in src/lib/pricing that the page
 * prints, and only then.
 */
export const PRICING_PAGE_UPDATED_ISO = "2026-11-23";
