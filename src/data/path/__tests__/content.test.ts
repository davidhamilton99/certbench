import { describe, expect, it } from "vitest";
import { PATH_CONTENT } from "../index";
import { OBJECTIVE_TITLES } from "../titles";
import { LEARN_NEW_REPS } from "@/core/path/plan";
import { authoredRepId } from "@/core/path/rep-id";
import { wordCount } from "@/core/path/text";
import { PATH_CERTS } from "@/core/path/types";
import { getRecallDecks } from "@/data/recall";

/**
 * Integrity of every hand-written rep. A broken rep fails here, at build time,
 * never in front of someone studying.
 */

const SECURITY_PLUS_OBJECTIVES = Object.keys(OBJECTIVE_TITLES["security-plus-sy0-701"]);

describe("path content", () => {
  for (const cert of PATH_CERTS) {
    const content = PATH_CONTENT[cert];
    const all = [...content.authored, ...(content.warmup.authored ?? [])];

    describe(cert, () => {
      it("uses unique keys, so rep ids never collide", () => {
        const ids = all.map((r) => authoredRepId(r.objective, r.key));
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id.length).toBeLessThanOrEqual(64);
      });

      it("tags every rep to a real objective", () => {
        const known = new Set(Object.keys(OBJECTIVE_TITLES[cert]));
        for (const r of all) expect(known, `${r.key} → ${r.objective}`).toContain(r.objective);
      });

      it("keeps reps short enough to answer in seconds", () => {
        for (const r of all) {
          const limit = r.tier === "exam" ? 40 : 25;
          expect(wordCount(r.prompt), `${r.key}: ${r.prompt}`).toBeLessThanOrEqual(limit);
          expect(wordCount(r.takeaway), `${r.key} takeaway`).toBeLessThanOrEqual(30);
          expect(r.takeaway.trim().length, `${r.key} takeaway`).toBeGreaterThan(0);
          if (r.kind === "choice") {
            for (const o of r.options) {
              expect(wordCount(o), `${r.key} option "${o}"`).toBeLessThanOrEqual(8);
            }
          }
        }
      });

      it("gives every choice rep four distinct options", () => {
        for (const r of all) {
          if (r.kind !== "choice") continue;
          expect(r.options, r.key).toHaveLength(4);
          const lowered = r.options.map((o) => o.trim().toLowerCase());
          expect(new Set(lowered).size, `${r.key} has a duplicate option`).toBe(4);
          expect(lowered.every((o) => o.length > 0), r.key).toBe(true);
        }
      });

      it("gives typed reps an answer", () => {
        for (const r of all) {
          if (r.kind === "typed") expect(r.answer.trim().length, r.key).toBeGreaterThan(0);
        }
      });

      it("maps recall tables that exist for this exam", () => {
        const tables = new Set(getRecallDecks(cert).map((d) => d.config.tableId));
        for (const tableId of Object.keys(content.recallTables)) {
          expect(tables, `${cert} has no deck for ${tableId}`).toContain(tableId);
        }
        for (const { tableId } of content.warmup.decks ?? []) {
          expect(tables, `${cert} warm-up deck ${tableId}`).toContain(tableId);
        }
      });
    });
  }

  it("writes a full learn stop for every Security+ objective", () => {
    const authored = PATH_CONTENT["security-plus-sy0-701"].authored;
    for (const code of SECURITY_PLUS_OBJECTIVES) {
      const count = authored.filter((r) => r.objective === code).length;
      expect(count, `Security+ ${code}`).toBeGreaterThanOrEqual(LEARN_NEW_REPS);
    }
  });

  it("opens Security+ with a warm-up that ends on an exam-style rep", () => {
    const warmup = PATH_CONTENT["security-plus-sy0-701"].warmup.authored ?? [];
    expect(warmup.length).toBeGreaterThanOrEqual(6);
    expect(warmup.at(-1)?.tier).toBe("exam");
  });
});
