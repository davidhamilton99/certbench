import { describe, expect, it } from "vitest";
import { PATH_CONTENT, type PathContent } from "../index";
import { SY0_701_DROPPED, SY0_701_REWORDED, SY0_801_PATH_CONTENT } from "../security-plus-sy0-801";
import { OBJECTIVE_TITLES } from "../titles";
import type { AuthoredRep } from "../types";
import { LEARN_NEW_REPS } from "@/core/path/plan";
import { authoredRepId } from "@/core/path/rep-id";
import { wordCount } from "@/core/path/text";
import { PATH_CERTS } from "@/core/path/types";
import { getRecallDecks } from "@/data/recall";
import { sy0801Codes } from "@/data/sy0-801";

/**
 * Integrity of every hand-written rep. A broken rep fails here, at build time,
 * never in front of someone studying.
 */

const SECURITY_PLUS_OBJECTIVES = Object.keys(OBJECTIVE_TITLES["security-plus-sy0-701"]);
const SY0_801 = "security-plus-sy0-801";

// Every exam on the path, plus Security+ SY0-801 until the switch-over puts it
// in PATH_CONTENT: its reps meet the same rules before anyone can study them.
const CONTENT: [string, PathContent][] = PATH_CERTS.map((cert) => [cert, PATH_CONTENT[cert]]);
if (!CONTENT.some(([cert]) => cert === SY0_801)) CONTENT.push([SY0_801, SY0_801_PATH_CONTENT]);

const everyRep = (content: PathContent): AuthoredRep[] => [...content.authored, ...(content.warmup.authored ?? [])];
const answerOf = (r: AuthoredRep) => (r.kind === "typed" ? r.answer : r.options[0]);

describe("path content", () => {
  for (const [cert, content] of CONTENT) {
    const all = everyRep(content);

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

describe("Security+ SY0-801 content", () => {
  const codes = sy0801Codes();
  const sy0801 = everyRep(SY0_801_PATH_CONTENT);
  const sy0701 = everyRep(PATH_CONTENT["security-plus-sy0-701"]);
  const byKey801 = new Map(sy0801.map((r) => [r.key, r]));
  const byKey701 = new Map(sy0701.map((r) => [r.key, r]));

  it("names exactly SY0-801's objectives, in order", () => {
    expect(Object.keys(OBJECTIVE_TITLES[SY0_801])).toEqual(codes);
  });

  it("writes a full learn stop for every SY0-801 objective", () => {
    for (const code of codes) {
      const count = SY0_801_PATH_CONTENT.authored.filter((r) => r.objective === code).length;
      expect(count, `SY0-801 ${code}`).toBeGreaterThanOrEqual(LEARN_NEW_REPS);
    }
  });

  it("uses each key once across the whole exam, warm-up included", () => {
    expect(byKey801.size).toBe(sy0801.length);
  });

  it("opens with a warm-up that includes an AI rep and ends on an exam-style rep", () => {
    const warmup = SY0_801_PATH_CONTENT.warmup.authored ?? [];
    expect(warmup.length).toBeGreaterThanOrEqual(6);
    expect(warmup.some((r) => r.objective === "2.6")).toBe(true);
    expect(warmup.at(-1)?.tier).toBe("exam");
  });

  it("teaches every one of objective 2.6's thirteen AI topics", () => {
    expect(SY0_801_PATH_CONTENT.authored.filter((r) => r.objective === "2.6")).toHaveLength(13);
  });

  it("accounts for every SY0-701 rep: carried by its key, reworded, or dropped with a reason", () => {
    for (const r of sy0701) {
      const dropped = r.key in SY0_701_DROPPED;
      expect(byKey801.has(r.key) !== dropped, `${r.key} must be carried or dropped, not both`).toBe(true);
    }
    for (const [key, why] of [...Object.entries(SY0_701_DROPPED), ...Object.entries(SY0_701_REWORDED)]) {
      expect(byKey701.has(key), `${key} is not an SY0-701 rep`).toBe(true);
      expect(why.length, key).toBeGreaterThan(30);
    }
    for (const key of Object.keys(SY0_701_REWORDED)) expect(byKey801.has(key), key).toBe(true);
  });

  it("keeps a carried rep's prompt and answer unless it is listed as reworded", () => {
    const same = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, "") === b.toLowerCase().replace(/\s+/g, "");
    for (const r of sy0801) {
      const before = byKey701.get(r.key);
      if (!before || r.key in SY0_701_REWORDED) continue;
      expect(r.prompt, r.key).toBe(before.prompt);
      expect(same(answerOf(r), answerOf(before)), `${r.key}: "${answerOf(before)}" → "${answerOf(r)}"`).toBe(true);
    }
  });

  it("carries 171 SY0-701 reps as they were, rewords 21, drops 12 and adds 185", () => {
    const carried = sy0801.filter((r) => byKey701.has(r.key));
    expect(carried.length - Object.keys(SY0_701_REWORDED).length).toBe(171);
    expect(Object.keys(SY0_701_REWORDED)).toHaveLength(21);
    expect(Object.keys(SY0_701_DROPPED)).toHaveLength(12);
    expect(sy0801.length - carried.length).toBe(185);
    expect(carried.length + Object.keys(SY0_701_DROPPED).length).toBe(sy0701.length);
  });

  it("never offers an SY0-701 label that SY0-801 replaced", () => {
    const replaced =
      /bloatware|removable device|unsecure network|script kidd|ICS\/SCADA|\bSASE\b|geographic restriction|configuration enforcement|deterrent|attribute-based|out-of-cycle/i;
    for (const r of sy0801) {
      if (r.kind !== "choice") continue;
      for (const o of r.options) expect(o, r.key).not.toMatch(replaced);
    }
  });
});
