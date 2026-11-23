import "server-only";

import { ApiError } from "@/contracts/common";

/**
 * Supabase answers one select with at most 1,000 rows and says nothing about
 * the rows it left out. A question bank can hold more than that (SY0-801 has
 * 1,008 questions), and so can one member's answer history for an exam.
 */
export const PAGE_SIZE = 1000;

interface PageResult<Row> {
  data: Row[] | null;
  error: { message: string } | null;
}

/**
 * Every row of a select that may run past one page, read a page at a time.
 *
 * `page(from, to)` builds the select for one range and MUST put the rows in a
 * fixed order (a unique column), or two pages can overlap or skip a row:
 *
 *   const rows = await allRows((from, to) =>
 *     db.from("cert_questions").select("id").eq("certification_id", id).order("id").range(from, to)
 *   );
 *
 * A failed page throws, so a caller never mistakes part of a table for all of it.
 */
export async function allRows<Row>(
  page: (from: number, to: number) => PromiseLike<PageResult<Row>>
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new ApiError("internal", error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
