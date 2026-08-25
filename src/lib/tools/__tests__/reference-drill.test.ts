import { describe, expect, it } from "vitest";
import { referenceRegistry } from "@/data/reference";
import type { ReferenceTable } from "@/data/reference/types";
import {
  canDrillTable,
  generateReferenceQuestion,
  type Rng,
} from "@/lib/tools/reference-drill";

/** Deterministic RNG (mulberry32) for reproducible sweeps. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allTables: { slug: string; table: ReferenceTable }[] = Object.entries(
  referenceRegistry
).flatMap(([slug, tables]) => tables.map((table) => ({ slug, table })));

describe("reference-drill generator", () => {
  it("has reference tables to drill", () => {
    expect(allTables.length).toBeGreaterThan(10);
  });

  it("every reference table is drillable", () => {
    for (const { slug, table } of allTables) {
      expect(canDrillTable(table), `${slug}/${table.id}`).toBe(true);
    }
  });

  it("generated questions are well-formed for every table (seeded sweep)", () => {
    const rng = seeded(2026);
    for (const { slug, table } of allTables) {
      for (let i = 0; i < 60; i++) {
        const q = generateReferenceQuestion(table, rng);
        expect(q, `${slug}/${table.id} #${i}`).not.toBeNull();
        if (!q) continue;

        // The answer is genuinely in the options.
        expect(q.options).toContain(q.answer);
        // Options are distinct.
        expect(new Set(q.options).size).toBe(q.options.length);
        // Between 2 and 4 options.
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        // Prompt and answer come from different columns.
        expect(q.promptLabel).not.toBe(q.answerLabel);

        // The answer is a real value of the answer column; the prompt value is
        // a real value of the prompt column, and they co-occur in one row.
        const answerKey = table.columnHeaders.find((c) => c.label === q.answerLabel)!.key;
        const promptKey = table.columnHeaders.find((c) => c.label === q.promptLabel)!.key;
        const rowMatch = table.entries.some(
          (e) =>
            e.columns[promptKey]?.trim() === q.promptValue &&
            e.columns[answerKey]?.trim() === q.answer
        );
        expect(rowMatch, `${slug}/${table.id}: ${q.promptValue} → ${q.answer}`).toBe(true);

        // Every distractor is a real value of the answer column (never invented).
        const answerValues = new Set(
          table.entries.map((e) => e.columns[answerKey]?.trim()).filter(Boolean)
        );
        for (const opt of q.options) {
          expect(answerValues.has(opt), `${slug}/${table.id}: option "${opt}"`).toBe(true);
        }
      }
    }
  });

  it("returns null for a single-column table", () => {
    const oneCol: ReferenceTable = {
      id: "x",
      title: "x",
      description: "",
      columnHeaders: [{ key: "a", label: "A" }],
      entries: [{ columns: { a: "1" } }, { columns: { a: "2" } }],
    };
    expect(canDrillTable(oneCol)).toBe(false);
    expect(generateReferenceQuestion(oneCol, seeded(1))).toBeNull();
  });
});
