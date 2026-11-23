import { describe, expect, it } from "vitest";
import { ApiError } from "@/contracts/common";
import { allRows, PAGE_SIZE } from "../paging";

/** A table of `total` rows that answers one range at a time, as Supabase does. */
function table(total: number) {
  const asked: [number, number][] = [];
  const page = async (from: number, to: number) => {
    asked.push([from, to]);
    const data = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => ({ n: from + i }));
    return { data, error: null };
  };
  return { asked, page };
}

describe("allRows", () => {
  it("reads a page of 1,000 rows at a time", () => {
    expect(PAGE_SIZE).toBe(1000);
  });

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

  it("keeps the rows in order and reads none of them twice", async () => {
    const { page } = table(2500);
    const rows = await allRows(page);
    expect(rows.map((r) => r.n)).toEqual(Array.from({ length: 2500 }, (_, i) => i));
  });

  it("asks once more after a page that came back full, in case the table ends exactly there", async () => {
    const { asked, page } = table(2000);
    const rows = await allRows(page);
    expect(rows).toHaveLength(2000);
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("answers with no rows for an empty table", async () => {
    expect(await allRows(table(0).page)).toEqual([]);
    expect(await allRows(async () => ({ data: null, error: null }))).toEqual([]);
  });

  it("fails when a page fails, so part of a table is never taken for all of it", async () => {
    let calls = 0;
    const page = async (from: number, to: number) => {
      calls += 1;
      if (from >= 1000) return { data: null, error: { message: "statement timeout" } };
      return { data: Array.from({ length: to - from + 1 }, (_, i) => ({ n: from + i })), error: null };
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
