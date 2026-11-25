import { describe, expect, it } from "vitest";
import { pbqRegistry } from "..";

/**
 * Every table in a lab's evidence that has a rule of dashes under its header
 * keeps its rows in their columns: each cell starts where its dashes start, or
 * ends where they end (a number set to the right). A table is drawn exactly as
 * it is written, in the code face, so a row one space out is a row out of its
 * column on every screen. (Task Manager's status column was one space out.)
 */
function blocks(): { where: string; content: string }[] {
  const out: { where: string; content: string }[] = [];
  for (const [cert, list] of Object.entries(pbqRegistry)) {
    for (const s of list) {
      if (s.type === "simulation") {
        for (const t of s.tasks) for (const e of t.evidence ?? []) out.push({ where: `${cert} ${t.id}: ${e.label}`, content: e.content });
      }
      if (s.type === "topology") {
        for (const d of s.devices) if (d.currentConfig) out.push({ where: `${cert} ${s.id}: ${d.label}`, content: d.currentConfig });
      }
    }
  }
  return out;
}

const RULE = /^[\s-]*-{2,} +-{2,}[\s-]*$/;

/** Rows under a rule whose cells start neither where their dashes start nor end where they end. */
function strayRows(content: string): string[] {
  const out: string[] = [];
  let spans: [number, number][] | null = null;
  for (const line of content.split("\n")) {
    if (RULE.test(line)) {
      spans = [...line.matchAll(/-+/g)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
      continue;
    }
    // A table ends at a blank line: the notes under it are prose.
    if (!line.trim()) {
      spans = null;
      continue;
    }
    if (!spans) continue;
    spans.forEach(([start, end], k) => {
      const next = k + 1 < spans!.length ? spans![k + 1][0] - 1 : line.length;
      const from = Math.max(0, start - 1);
      const cell = /\S(?:.*\S)?/.exec(line.slice(from, Math.max(from, next)));
      if (!cell) return;
      const at = from + cell.index;
      if (at !== start && at + cell[0].length !== end) out.push(`${JSON.stringify(line)} (column ${k + 1})`);
    });
  }
  return out;
}

describe("tables in the labs' evidence", () => {
  it("keep every row in its columns", () => {
    const stray = blocks().flatMap((b) => strayRows(b.content).map((row) => `${b.where}: ${row}`));
    expect(stray).toEqual([]);
  });
});
