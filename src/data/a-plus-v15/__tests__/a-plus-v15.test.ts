import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { domainLab } from "@/core/path/labs";
import { EMPTY_PATH_PROGRESS, PATH_CERTS, type PathCert, type PathProgress } from "@/core/path/types";
import { PRE_V15_SLUG } from "@/components/path/storage-key";
import { PATH_CONTENT } from "@/data/path";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { pbqRegistry } from "@/data/pbq";
import { A_PLUS_V15, CORE1_V15, CORE2_V15, migrateAPlusV14Progress, v15Codes, v15ObjectiveOf } from "..";
import { activeAfterMigration, buildAPlusV15Migration } from "../migration-sql";
import { CORE1_NEW_QUESTIONS } from "../new-questions/core1";
import { CORE2_NEW_QUESTIONS } from "../new-questions/core2";
import { practicePageFor } from "@/lib/seo/cert-pages";
import { OBJECTIVE_HUB_CERTS } from "@/lib/seo/exam-versions";
import { A_PLUS_PRACTICE_PAGES, aPlusV14Redirects } from "../redirects";
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

describe.each(A_PLUS_V15.map((exam) => [exam.examCode, exam] as const))("A+ %s on the site", (_, exam) => {
  const cert = exam.slug as PathCert;

  it("has a path named with V15's objectives", () => {
    expect(PATH_CERTS).toContain(exam.slug);
    expect(PATH_CERTS).not.toContain(exam.oldSlug);
    const labels = Object.fromEntries(exam.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.label])));
    expect(OBJECTIVE_TITLES[exam.slug]).toEqual(labels);
  });

  it("teaches each recall deck under the objective the progress carry-over files it", () => {
    const { subnet, ...decks } = exam.recallDecks;
    const kept = Object.entries(decks).filter((entry): entry is [string, string] => entry[1] !== null);
    expect(PATH_CONTENT[cert].recallTables).toEqual(Object.fromEntries(kept));
    expect(Object.keys(PATH_CONTENT[cert].subnetting ?? {})).toEqual(subnet ? [subnet] : []);
  });

  it("finds a device's old copy under the slug it had", () => {
    expect(PRE_V15_SLUG[exam.slug]).toBe(exam.oldSlug);
  });

  it("closes each changed domain with the lab a learner's record is rebuilt from", () => {
    for (const [stop, scenario] of Object.entries(exam.changedLabs)) {
      expect(domainLab(pbqRegistry[cert], `${stop.slice(3)}.0`)?.id, stop).toBe(scenario);
    }
  });
});

describe("A+ labs on V15", () => {
  it("drops the troubleshooting-methodology drill, which 220-1201 doesn't test", () => {
    expect(pbqRegistry[CORE1_V15.slug].some((s) => s.id.includes("methodology"))).toBe(false);
    // Domain 5 was always closed by a simulation, so Core 1's lab stops carry over as they are.
    expect(domainLab(pbqRegistry[CORE1_V15.slug], "5.0")?.id).toBe("aplus-core1-sim-post-failure");
  });

  it("files malware removal under Security, where 220-1202 puts it", () => {
    const malware = pbqRegistry[CORE2_V15.slug].filter((s) => s.id.includes("malware-removal"));
    expect(malware.map((s) => s.domain_number)).toEqual(["2.0", "2.0"]);
  });
});

describe("redirects from the 220-1101/1102 pages", () => {
  const redirects = aPlusV14Redirects();
  const to = (source: string) => redirects.find((r) => r.source === source)?.destination;

  it("sends every old page somewhere, permanently and once", () => {
    expect(new Set(redirects.map((r) => r.source)).size).toBe(redirects.length);
    expect(redirects.every((r) => r.permanent)).toBe(true);
    // Every old objective page, plus each exam's path, readiness check and objectives index.
    const oldObjectives = A_PLUS_V15.reduce((n, exam) => n + Object.keys(exam.objectiveMap).length, 0);
    expect(redirects).toHaveLength(oldObjectives + 3 * A_PLUS_V15.length);
  });

  it("sends each objective page to the objective its topic moved to", () => {
    expect(to("/objectives/a-plus-core1-220-1101/1-2")).toBe("/objectives/a-plus-core1-220-1201/3-1");
    expect(to("/objectives/a-plus-core1-220-1101/3-7")).toBe("/objectives/a-plus-core1-220-1201/4-2");
    expect(to("/objectives/a-plus-core2-220-1102/3-3")).toBe("/objectives/a-plus-core2-220-1202/2-6");
    expect(to("/objectives/a-plus-core2-220-1102/1-11")).toBe("/objectives/a-plus-core2-220-1202/1-9");
    // The methodology left the exam: its page sends people to the Core 1 practice test.
    expect(to("/objectives/a-plus-core1-220-1101/5-1")).toBe("/a-plus-core-1-practice-test");
    for (const exam of A_PLUS_V15) {
      for (const r of redirects.filter((r) => r.destination.startsWith(`/objectives/${exam.slug}/`))) {
        expect(v15Codes(exam)).toContain(r.destination.split("/").pop()!.replace("-", "."));
      }
    }
  });

  it("moves each exam's path, readiness check and objectives index to its V15 slug", () => {
    expect(to("/path/a-plus-core1-220-1101")).toBe("/path/a-plus-core1-220-1201");
    expect(to("/path/a-plus-core2-220-1102")).toBe("/path/a-plus-core2-220-1202");
    expect(to("/readiness-check/a-plus-core1-220-1101")).toBe("/readiness-check/a-plus-core1-220-1201");
    expect(to("/readiness-check/a-plus-core2-220-1102")).toBe("/readiness-check/a-plus-core2-220-1202");
    expect(to("/objectives/a-plus-core1-220-1101")).toBe("/objectives/a-plus-core1-220-1201");
    expect(to("/objectives/a-plus-core2-220-1102")).toBe("/objectives/a-plus-core2-220-1202");
  });

  it("lands on pages that exist: each core's practice test and objectives index", () => {
    for (const exam of A_PLUS_V15) {
      expect(A_PLUS_PRACTICE_PAGES[exam.slug]).toBe(practicePageFor(exam.slug));
      expect(OBJECTIVE_HUB_CERTS).toContain(exam.slug);
    }
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
      "r|2.6|subnet|cidr-mask": at(6),
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
    expect(Object.keys(after.items)).toHaveLength(4);
  });

  it("keeps subnetting answers under 2.6, where 220-1201 tests subnet masks", () => {
    // Old 2.6 (network configuration) maps to 2.4, but the subnetting skills stay on 2.6.
    expect(after.items["r|2.6|subnet|cidr-mask"]).toEqual(at(6));
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

  it("counts a lab stop whose domain now closes with another scenario only if that one was played", () => {
    const stop = (n: number) => ({ n: 1, c: 3, t: 3, at: n });
    const core2 = migrateAPlusV14Progress(
      {
        ...EMPTY_PATH_PROGRESS,
        stops: { lab1: stop(1), lab2: stop(2), lab3: stop(3), lab4: stop(4) },
        labs: { "aplus-core2-sim-malware-removal": stop(9), "aplus-core2-sim-mobile-security": stop(2) },
      },
      CORE2_V15
    );
    expect(core2.stops).toEqual({ lab1: stop(1), lab2: stop(9) });
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

  it("is committed as 029 exactly as the builder makes it, new questions included", () => {
    const release = buildAPlusV15Migration([
      { exam: CORE1_V15, bank: questionsOf(CORE1_V15), newQuestions: CORE1_NEW_QUESTIONS },
      { exam: CORE2_V15, bank: questionsOf(CORE2_V15), newQuestions: CORE2_NEW_QUESTIONS },
    ]);
    const file = readFileSync(join(process.cwd(), "supabase/migrations/029_a_plus_v15.sql"), "utf8");
    expect(file.replace(/\r\n/g, "\n")).toBe(release);
    expect(release).toContain(`<> ${activeAfterMigration(CORE1_V15, questionsOf(CORE1_V15)) + CORE1_NEW_QUESTIONS.length} then`);
    expect(release).toContain(`<> ${activeAfterMigration(CORE2_V15, questionsOf(CORE2_V15)) + CORE2_NEW_QUESTIONS.length} then`);
  });

  it("moves both exams, and their saved paths, to the V15 slugs", () => {
    expect(sql).toContain("set slug = 'a-plus-core1-220-1201', exam_code = '220-1201', passing_score = 675");
    expect(sql).toContain("set slug = 'a-plus-core2-220-1202', exam_code = '220-1202', passing_score = 700");
    expect(sql).toContain("update path_progress p\nset cert_slug = 'a-plus-core1-220-1201',");
    expect(sql).toContain("update path_progress p\nset cert_slug = 'a-plus-core2-220-1202',");
    // Saved paths may only use the slugs the code knows, so nothing writes the old ones again.
    const check = sql.slice(sql.indexOf("add constraint path_progress_cert_slug_check"));
    expect(check).toMatch(/^[^;]*'a-plus-core1-220-1201', 'a-plus-core2-220-1202'\n\)\);/);
    expect(check.slice(0, check.indexOf(";"))).not.toContain("220-110");
  });
});
