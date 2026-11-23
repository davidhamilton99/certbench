import "server-only";

import { ApiError } from "@/contracts/common";

/**
 * Supabase answers one select with at most 1,000 rows and says nothing about
 * the rows it left out. A question bank can hold more than that (SY0-801 has
 * 1,008 questions), and so can one member's answer history for an exam.
 *
 * This is how many rows a page asks for. How many it is given is the
 * database's own decision: its limit is a setting of the project and can be
 * lower. `allRows` therefore never takes a short page for the last one.
 */
export const PAGE_SIZE = 1000;

interface PageResult<Row> {
  data: Row[] | null;
  error: { message: string } | null;
  /**
   * How many rows the whole select matches, on every page alike, when the
   * select asked for it with `{ count: "exact" }`.
   */
  count?: number | null;
}

/**
 * Every row of a select that may run past one page, read a page at a time.
 *
 * `page(from, to)` builds the select for one range. It MUST put the rows in a
 * fixed order (a unique column), or two pages can overlap or skip a row, and
 * it should ask for the exact count, which is how the read knows that it has
 * every row:
 *
 *   const rows = await allRows((from, to) =>
 *     db
 *       .from("cert_questions")
 *       .select("id", { count: "exact" })
 *       .eq("certification_id", id)
 *       .order("id")
 *       .range(from, to)
 *   );
 *
 * The next page starts after the rows received, however few they were, so the
 * read is complete whatever the database's own limit on one answer is. It ends
 * when the rows in hand reach the count. A select that sends no count is read
 * until a page comes back empty, which costs one request more: with the count
 * a table that fits in one page is one request.
 *
 * A failed page throws, and so does a page that comes back empty while the
 * count says that rows are missing, so a caller never mistakes part of a table
 * for all of it.
 */
export async function allRows<Row>(
  page: (from: number, to: number) => PromiseLike<PageResult<Row>>
): Promise<Row[]> {
  const rows: Row[] = [];
  for (;;) {
    const { data, error, count } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw new ApiError("internal", error.message);
    const counted = typeof count === "number" && Number.isFinite(count) ? count : null;
    if (!data || data.length === 0) {
      // Nothing more can be read. Without a count that is the end of the table.
      if (counted !== null && rows.length < counted) {
        throw new ApiError("internal", `A paged read ended after ${rows.length} of ${counted} rows`);
      }
      return rows;
    }
    rows.push(...data);
    if (counted !== null && rows.length >= counted) return rows;
  }
}
