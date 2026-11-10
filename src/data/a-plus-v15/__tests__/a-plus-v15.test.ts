import { describe, expect, it } from "vitest";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import { A_PLUS_V15, CORE1_V15, CORE2_V15, migrateAPlusV14Progress, v15Codes, v15ObjectiveOf } from "..";
import { activeAfterMigration, buildAPlusV15Migration } from "../migration-sql";
import type { V15Exam } from "../types";
import bankJson from "../v14-bank.json";

// JSON arrays type as string[][]; each row is an [id, old objective] pair.
const bank = bankJson as unknown as Record<string, [string, string][]>;
const questionsOf = (exam: V15Exam) => bank[exam.oldSlug];

/** Active questions per V15 objective once the old bank follows the map. */
function counts(exam: V15Exam): Record<string, number> {
  const out = Object.fromEntries(v15Codes(exam).map((c) => [c, 0]));
  for (const [id, code] of questionsOf(exam)) {
    const to = v15ObjectiveOf(exam, id, code);
    if (to) out[to]++;
  }
  return out;
}

describe.each(A_PLUS_V15.map((exam) => [exam.examCode, exam] as const))("A+ %s", (_, exam) => {
  const codes = v15Codes(exam);
  const ids = new Set(questionsOf(exam).map(([id]) => id));

  it("has CompTIA's domains, weighted to 100%", () => {
    expect(exam.domains.reduce((s, d) => s + d.weight, 0)).toBe(100);
    for (const d of exam.domains) {
      d.objectives.forEach((o, i) => expect(o.code).toBe(`${d.number.replace(/\.0$/, "")}.${i + 1}`));
    }
  });

  it("labels every objective in its own words, once", () => {
    const labels = exam.domains.flatMap((d) => d.objectives.map((o) => o.label));
    expect(new Set(labels).size).toBe(labels.length);
    for (const o of exam.domains.flatMap((d) => d.objectives)) {
      expect(o.label.length).toBeGreaterThan(2);
      expect(o.title).not.toMatch(/^Given a scenario/);
    }
  });

  it("maps every old objective, and only onto V15 objectives", () => {
    const old = new Set(questionsOf(exam).map(([, code]) => code));
    expect(new Set(Object.keys(exam.objectiveMap))).toEqual(old);
    for (const to of Object.values(exam.objectiveMap)) if (to !== null) expect(codes).toContain(to);
    for (const to of Object.values(exam.recallDecks)) if (to !== null) expect(codes).toContain(to);
  });

  it("names only real questions, each decision once and with its reason", () => {
    for (const [id, o] of Object.entries(exam.overrides)) {
      expect(ids.has(id)).toBe(true);
      expect(codes).toContain(o.to);
      expect(o.why.length).toBeGreaterThan(20);
      expect(id in exam.retired).toBe(false);
    }
    for (const [id, why] of Object.entries(exam.retired)) {
      expect(ids.has(id)).toBe(true);
      expect(why.length).toBeGreaterThan(15);
    }
    for (const [id, fix] of Object.entries(exam.fixes)) {
      expect(ids.has(id)).toBe(true);
      expect(id in exam.retired).toBe(false);
      if (fix.options) expect(new Set(fix.options.map((o) => o.trim().toLowerCase())).size).toBe(4);
      expect(fix.explanation.length).toBeGreaterThan(120);
    }
  });

  it("keeps the old questions it can on V15, and names the gap new questions must fill", () => {
    const active = Object.values(counts(exam)).reduce((s, n) => s + n, 0);
    expect(active).toBe(activeAfterMigration(exam, questionsOf(exam)));
  });
});

describe("the gap new questions fill", () => {
  // Objectives under the 12 a stop and the checkpoint need, from the old bank alone.
  const short = (exam: V15Exam) =>
    Object.fromEntries(Object.entries(counts(exam)).filter(([, n]) => n < 12));

  it("is two printer objectives on Core 1", () => {
    expect(short(CORE1_V15)).toEqual({ "3.7": 10, "3.8": 5 });
  });

  it("is two new objectives and six thin ones on Core 2", () => {
    expect(short(CORE2_V15)).toEqual({
      "1.1": 7,
      "1.2": 11,
      "1.5": 11,
      "1.10": 8,
      "1.11": 0,
      "4.1": 8,
      "4.9": 11,
      "4.10": 0,
    });
  });
});

describe("migrateAPlusV14Progress", () => {
  const at = (n: number) => ({ a: 1, c: 1, s: 1, t: n });
  const stop = (n: number) => ({ n: 1, c: 3, t: 3, at: n });
  const [overridden, override] = Object.entries(CORE1_V15.overrides)[0];
  const retiredId = Object.keys(CORE1_V15.retired)[0];
  const plain = questionsOf(CORE1_V15).find(
    ([id, code]) => code === "1.3" && !(id in CORE1_V15.overrides) && !(id in CORE1_V15.retired)
  )![0];
  const oldCodeOf = (id: string) => questionsOf(CORE1_V15).find(([q]) => q === id)![1];

  const before: PathProgress = {
    ...EMPTY_PATH_PROGRESS,
    items: {
      [`q|1.3|${plain}`]: at(1),
      [`q|${oldCodeOf(overridden)}|${overridden}`]: at(2),
      [`q|${oldCodeOf(retiredId)}|${retiredId}`]: at(3),
      "r|3.6|printer-types|0a1b2c3d": at(4),
      "r|5.1|troubleshooting-steps|0a1b2c3d": at(5),
    },
    stops: {
      warmup: stop(1),
      "1.3": stop(2),
      "3.7": stop(3),
      "4.1": stop(9),
      "5.1": stop(4),
      d1: stop(5),
      lab2: stop(6),
      checkpoint: stop(7),
    },
    goal: { examDate: null, target: null, minutes: 20, at: 1 },
  };
  const after = migrateAPlusV14Progress(before, CORE1_V15);

  it("re-keys answers to their question's V15 objective, overrides included", () => {
    expect(after.items[`q|1.2|${plain}`]).toEqual(at(1));
    expect(after.items[`q|${override.to}|${overridden}`]).toEqual(at(2));
  });

  it("re-keys recall answers by deck, and drops what V15 doesn't test", () => {
    expect(after.items["r|3.8|printer-types|0a1b2c3d"]).toEqual(at(4));
    expect(Object.keys(after.items).some((k) => k.includes(retiredId))).toBe(false);
    expect(Object.keys(after.items).some((k) => k.includes("troubleshooting-steps"))).toBe(false);
    expect(Object.keys(after.items)).toHaveLength(3);
  });

  it("counts a finished learn stop as its objective's V15 stop, keeping the later of two", () => {
    expect(after.stops["1.2"]).toEqual(stop(2));
    // Old 3.7 (mislabelled cloud) and old 4.1 (cloud) both become 4.2.
    expect(after.stops["4.2"]).toEqual(stop(9));
    expect(after.stops["5.1"]).toBeUndefined();
    expect(after.stops).toMatchObject({ warmup: stop(1), d1: stop(5), lab2: stop(6), checkpoint: stop(7) });
  });

  it("leaves everything else as it was", () => {
    expect(after.goal).toEqual(before.goal);
    expect(after.checkpoint).toBe(before.checkpoint);
    expect(after.labs).toBe(before.labs);
  });
});

describe("the migration SQL", () => {
  const sql = buildAPlusV15Migration(
    A_PLUS_V15.map((exam) => ({ exam, bank: questionsOf(exam), newQuestions: [] }))
  );

  it("runs as one transaction, guarded on the bank it was built from", () => {
    expect(sql.trimStart().startsWith("--")).toBe(true);
    expect(sql).toMatch(/\nbegin;\n/);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    expect(sql).toContain("<> 596 then");
    expect(sql).toContain("<> 538 then");
  });

  it("names every decided question and never deletes one", () => {
    for (const exam of A_PLUS_V15) {
      for (const id of [...Object.keys(exam.overrides), ...Object.keys(exam.retired), ...Object.keys(exam.fixes)]) {
        expect(sql).toContain(`'${id}'`);
      }
    }
    expect(sql).not.toMatch(/delete from cert_questions/i);
  });

  it("checks the active count it expects after the move", () => {
    expect(sql).toContain(`<> ${activeAfterMigration(CORE1_V15, questionsOf(CORE1_V15))} then`);
    expect(sql).toContain(`<> ${activeAfterMigration(CORE2_V15, questionsOf(CORE2_V15))} then`);
  });

  it("moves both exams to their V15 slugs and lets saved paths use them", () => {
    expect(sql).toContain("set slug = 'a-plus-core1-220-1201', exam_code = '220-1201', passing_score = 675");
    expect(sql).toContain("set slug = 'a-plus-core2-220-1202', exam_code = '220-1202', passing_score = 700");
    expect(sql).toMatch(/'a-plus-core1-220-1201', 'a-plus-core2-220-1202'\n\)\);/);
  });
});
