/**
 * The two widths every public page is set on.
 *
 * `PAGE` is the page's container, and it is the header's and the footer's
 * too: the logo, a page's title and every heading begin on one left edge.
 *
 * `COLUMN` is the reading column inside it: 48rem of headings, rules and
 * text, on that same edge. Running text inside the column is narrower still
 * (`cb-measure`); a table or a long list may leave the column and run to the
 * container's right edge.
 */
export const PAGE = "mx-auto w-full max-w-6xl px-5 sm:px-6";
export const COLUMN = "max-w-3xl";
