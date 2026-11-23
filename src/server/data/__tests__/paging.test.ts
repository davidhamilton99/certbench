import { describe, expect, it } from "vitest";
import { ApiError } from "@/contracts/common";
import { allRows, PAGE_SIZE } from "../paging";

/**
 * A table of `total` rows that answers one range at a time, as Supabase does:
 * never with more rows than its own limit (`cap`), whatever range was asked
 * for, and with the number of rows in the whole table when the select asked
 * for the count (`counted`).
 */
function table(total: number, { cap = 1000, counted = true }: { cap?: number; counted?: boolean } = {}) {
  const asked: [number, number][] = [];
  const page = async (from: number, to: number) => {
    asked.push([from, to]);
    const last = Math.min(to + 1, total, from + cap);
    const data = Array.from({ length: Math.max(0, last - from) }, (_, i) => ({ n: from + i }));
    return counted ? { data, error: null, count: total } : { data, error: null };
  };
  return { asked, page };
}

const inOrder = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("allRows", () => {
  it("asks for a page of 1,000 rows at a time", () => {
    expect(PAGE_SIZE).toBe(1000);
  });

  describe("when the select sends the exact count", () => {
    it("reads a table that fits in one page with one request", async () => {
      const { asked, page } = table(617);
      const rows = await allRows(page);
      expect(rows).toHaveLength(617);
      expect(asked).toEqual([[0, 999]]);
    });

    it("reads every row of a table larger than one page: 1,008 questions, not 1,000", async () => {
      const { asked, page } = table(1008);
      const rows = await allRows(page);
      expect(rows).toHaveLength(1008);
      expect(rows.at(-1)).toEqual({ n: 1007 });
      expect(asked).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
    });

    it("does not ask again after a page that came back full, when the count says the table ends there", async () => {
      const one = table(1000);
      expect(await allRows(one.page)).toHaveLength(1000);
      expect(one.asked).toEqual([[0, 999]]);

      const two = table(2000);
      expect(await allRows(two.page)).toHaveLength(2000);
      expect(two.asked).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
    });

    it("keeps the rows in order and reads none of them twice", async () => {
      const { page } = table(2500);
      const rows = await allRows(page);
      expect(rows.map((r) => r.n)).toEqual(inOrder(2500));
    });

    it("answers with no rows for an empty table, in one request", async () => {
      const { asked, page } = table(0);
      expect(await allRows(page)).toEqual([]);
      expect(asked).toEqual([[0, 999]]);
    });

    // The defect: the read ended at the first page shorter than 1,000 rows. A
    // database that gives at most 500 rows to an answer then gave 500 of 1,008
    // questions, with no error.
    it("reads every row when the database gives fewer rows to one answer than a page asks for", async () => {
      const { asked, page } = table(1008, { cap: 500 });
      const rows = await allRows(page);
      expect(rows.map((r) => r.n)).toEqual(inOrder(1008));
      // Each page starts after the rows received, not a full page further on.
      expect(asked).toEqual([
        [0, 999],
        [500, 1499],
        [1000, 1999],
      ]);
    });

    it("reads every row whatever that limit is", async () => {
      for (const cap of [1, 7, 250, 999, 1000, 5000]) {
        const { page } = table(1203, { cap });
        const rows = await allRows(page);
        expect(rows.map((r) => r.n), `a limit of ${cap}`).toEqual(inOrder(1203));
      }
    });

    it("fails when a page comes back empty while the count says that rows are missing", async () => {
      // 1,008 counted, and nothing to be read past the first 1,000.
      const page = async (from: number, to: number) => ({
        data: from >= 1000 ? [] : Array.from({ length: to - from + 1 }, (_, i) => ({ n: from + i })),
        error: null,
        count: 1008,
      });
      const outcome = await allRows(page).then(
        (rows) => rows,
        (error: unknown) => error
      );
      expect(outcome).toBeInstanceOf(ApiError);
      expect((outcome as ApiError).code).toBe("internal");
      expect((outcome as ApiError).message).toBe("A paged read ended after 1000 of 1008 rows");
    });

    it("goes by each page's own count, so rows removed during the read end it without a fault", async () => {
      // The first answer counts 1,008. Eight rows are removed before the second, which counts 1,000 and holds none.
      const page = async (from: number, to: number) =>
        from === 0
          ? { data: Array.from({ length: to + 1 }, (_, i) => ({ n: i })), error: null, count: 1008 }
          : { data: [], error: null, count: 1000 };
      expect(await allRows(page)).toHaveLength(1000);
    });
  });

  describe("when the select sends no count", () => {
    it("asks once more after a short page, and stops on the empty page", async () => {
      const { asked, page } = table(617, { counted: false });
      const rows = await allRows(page);
      expect(rows).toHaveLength(617);
      expect(asked).toEqual([
        [0, 999],
        [617, 1616],
      ]);
    });

    it("asks once more after a page that came back full, in case the table ends exactly there", async () => {
      const { asked, page } = table(2000, { counted: false });
      const rows = await allRows(page);
      expect(rows).toHaveLength(2000);
      expect(asked).toEqual([
        [0, 999],
        [1000, 1999],
        [2000, 2999],
      ]);
    });

    it("still reads every row when the database gives fewer rows to one answer than a page asks for", async () => {
      const { asked, page } = table(1008, { cap: 500, counted: false });
      const rows = await allRows(page);
      expect(rows.map((r) => r.n)).toEqual(inOrder(1008));
      expect(asked).toHaveLength(4);
    });

    it("takes a count that is not a number as no count", async () => {
      // The client reads the count from a header, and gives NaN for one it cannot read.
      const { page } = table(1008, { cap: 500, counted: false });
      const rows = await allRows(async (from, to) => ({ ...(await page(from, to)), count: Number.NaN }));
      expect(rows).toHaveLength(1008);
      const nulled = table(40, { counted: false });
      expect(await allRows(async (from, to) => ({ ...(await nulled.page(from, to)), count: null }))).toHaveLength(40);
    });

    it("answers with no rows for an empty table", async () => {
      expect(await allRows(table(0, { counted: false }).page)).toEqual([]);
      expect(await allRows(async () => ({ data: null, error: null }))).toEqual([]);
    });
  });

  it("fails when a page fails, so part of a table is never taken for all of it", async () => {
    let calls = 0;
    const page = async (from: number, to: number) => {
      calls += 1;
      if (from >= 1000) return { data: null, error: { message: "statement timeout" }, count: null };
      return { data: Array.from({ length: to - from + 1 }, (_, i) => ({ n: from + i })), error: null, count: 1008 };
    };
    const outcome = await allRows(page).then(
      (rows) => rows,
      (error: unknown) => error
    );
    expect(outcome).toBeInstanceOf(ApiError);
    expect((outcome as ApiError).code).toBe("internal");
    expect(calls).toBe(2);
  });
});
