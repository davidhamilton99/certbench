import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { longDate } from "@/core/path/versions";
import { pbqRegistry } from "@/data/pbq";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { PBQ_EXAMPLE_PAGES, practicePageFor, PRACTICE_TEST_PAGES } from "../cert-pages";
import { A_PLUS_ROUNDUP } from "../comparison-pages";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  COMPTIA_EXAM_PAGES,
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  EXAM_FACTS_CHECKED_ISO,
  OBJECTIVE_HUB_CERTS,
  replacedBy,
  SECURITY_PLUS_DOMAIN_CHANGES,
  usesOfficialObjectiveNumbers,
} from "../exam-versions";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const page = (path: string) => PRACTICE_TEST_PAGES.find((p) => p.path === path)!;
const answers = (path: string) => page(path).faqs.map((f) => f.answer).join(" ");

describe("exam facts on the public pages", () => {
  it("prints the day CompTIA's pages were read the same way in words and in the structured data", () => {
    expect(EXAM_FACTS_CHECKED).toBe(longDate(EXAM_FACTS_CHECKED_ISO));
  });

  it("cites a CompTIA page for every exam, Network+ included", () => {
    for (const url of Object.values(COMPTIA_URLS)) expect(url).toMatch(/^https:\/\/www\.comptia\.org\//);
    expect(COMPTIA_URLS.networkPlus).toBe("https://www.comptia.org/en-us/certifications/network/");
  });

  it("has SY0-701 and SY0-801 domain weights that each add up to the whole exam", () => {
    expect(sum(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0701))).toBe(100);
    expect(sum(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801))).toBe(100);
  });

  it("gives the domain weights that CompTIA's exam pages give", () => {
    expect(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0701)).toEqual([12, 22, 18, 28, 20]);
    expect(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801)).toEqual([16, 24, 19, 27, 14]);
    const weights = (path: string, examCode: string) =>
      page(path)
        .currentExams?.find((e) => e.examCode === examCode)
        ?.domains.map((d) => d.weight);
    expect(weights("network-plus-practice-test", "N10-009")).toEqual([23, 20, 19, 14, 24]);
    expect(weights("a-plus-practice-test", "220-1201")).toEqual([13, 23, 25, 11, 28]);
    expect(weights("a-plus-practice-test", "220-1202")).toEqual([28, 28, 23, 21]);
  });

  it("states each passing score on the scale CompTIA states it on", () => {
    expect(answers("security-plus-practice-test")).toContain("750 on a scale of 100 to 900");
    expect(answers("network-plus-practice-test")).toContain("720 on a scale of 100 to 900");
    expect(answers("a-plus-practice-test")).toContain("requires 675 and Core 2 (220-1202) requires 700, each on a scale of 900");
    expect(answers("a-plus-core-1-practice-test")).toContain("675 on a scale of 900");
    expect(answers("a-plus-core-2-practice-test")).toContain("700 on a scale of 900");
  });

  it("advises no percentage to aim for except the site's one readiness target", () => {
    for (const { path, faqs } of PRACTICE_TEST_PAGES) {
      for (const { question, answer } of faqs) {
        // Domain weights are percentages too, so only the answers about scores are read.
        if (!/score/i.test(question)) continue;
        const percentages = [...answer.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
        expect(percentages.filter((p) => p !== READINESS_TARGET), `${path}: ${question}`).toEqual([]);
      }
    }
  });

  it("lists current exams' domains that add up to the whole exam", () => {
    const outlines = PRACTICE_TEST_PAGES.flatMap((p) => p.currentExams ?? []);
    expect(outlines.length).toBeGreaterThan(0);
    for (const exam of outlines) {
      expect(sum(exam.domains.map((d) => d.weight)), exam.examCode).toBe(100);
    }
  });

  it("says A+ is written to today's exams, 220-1201 and 220-1202", () => {
    const aPlus = page("a-plus-practice-test");
    expect(aPlus.metaDescription).toContain("220-1201/1202");
    expect(aPlus.currentExams?.map((e) => e.examCode)).toEqual(["220-1201", "220-1202"]);
    expect(aPlus.faqs.map((f) => f.answer).join(" ")).toContain("retired on September 25, 2025");
    expect(A_PLUS_ROUNDUP.metaDescription).toContain("220-1201 and 220-1202");

    // Nothing says our A+ content is on the retired exams any more.
    const pbqPages = PBQ_EXAMPLE_PAGES.filter((p) => p.certSlug.startsWith("a-plus"));
    const copy = JSON.stringify([aPlus, A_PLUS_ROUNDUP, pbqPages]);
    expect(copy).not.toMatch(/[Ww]ritten to (the retired )?220-110[12]|haven't added the new/);
    expect(replacedBy(A_PLUS_CORE1_CERT)).toBeNull();
    expect(replacedBy(A_PLUS_CORE2_CERT)).toBeNull();
    expect(replacedBy("security-plus-sy0-701")).toBeNull();
  });

  it("keeps Network+ off official objective numbers until they are re-mapped", () => {
    expect(usesOfficialObjectiveNumbers("network-plus-n10-009")).toBe(false);
    expect(usesOfficialObjectiveNumbers("security-plus-sy0-701")).toBe(true);
  });

  it("gives every practice page a route, and each core of a split exam its own page", () => {
    for (const p of PRACTICE_TEST_PAGES) {
      expect(existsSync(join(process.cwd(), "src/app/(marketing)", p.path, "page.tsx")), p.path).toBe(true);
      for (const core of p.cores ?? []) {
        expect(PRACTICE_TEST_PAGES.some((other) => `/${other.path}` === core.href), core.href).toBe(true);
      }
    }
    expect(practicePageFor(A_PLUS_CORE1_CERT)).toBe("/a-plus-core-1-practice-test");
    expect(practicePageFor(A_PLUS_CORE2_CERT)).toBe("/a-plus-core-2-practice-test");
  });

  it("links every objectives index to its exam's CompTIA page and practice test", () => {
    expect(OBJECTIVE_HUB_CERTS).toEqual(expect.arrayContaining([A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT]));
    for (const cert of OBJECTIVE_HUB_CERTS) {
      expect(COMPTIA_EXAM_PAGES[cert], cert).toMatch(/^https:\/\/www\.comptia\.org\//);
      expect(practicePageFor(cert), cert).not.toBe("/start");
    }
  });

  it("has playable scenarios behind every PBQ page", () => {
    for (const p of PBQ_EXAMPLE_PAGES) {
      expect(pbqRegistry[p.certSlug]?.length ?? 0, p.path).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("what the PBQ pages say about the exam's own PBQs", () => {
  const EN_DASH = String.fromCharCode(0x2013);
  const copyOf = (p: (typeof PBQ_EXAMPLE_PAGES)[number]) => [...p.intro, ...p.faqs.map((f) => f.answer)].join(" ");

  it("gives no count, because CompTIA publishes none", () => {
    const range = new RegExp(`\\b\\d\\s*(?:${EN_DASH}|-|to)\\s*\\d\\b`);
    for (const p of PBQ_EXAMPLE_PAGES) {
      expect(copyOf(p), p.path).not.toMatch(range);
      const count = p.faqs.find((f) => /^How many PBQs/.test(f.question));
      expect(count?.answer, p.path).toMatch(/^CompTIA does not publish a number, and it varies by exam form\./);
    }
  });

  it("says nothing about how CompTIA weights or scores them", () => {
    for (const p of PBQ_EXAMPLE_PAGES) {
      expect(copyOf(p), p.path).not.toMatch(
        /worth more|carry more weight|partial credit is awarded|award partial credit|find most difficult/i
      );
    }
  });
});

describe("claims the practice-test pages and PBQ pages do not make", () => {
  it("say nothing about what most candidates do, or what an exam tests most", () => {
    const copy = JSON.stringify([PRACTICE_TEST_PAGES, PBQ_EXAMPLE_PAGES]);
    expect(copy).not.toMatch(/most candidates|many people|most people|candidates find|commonly|tests most/i);
  });

  it("attribute the advice on which exam to take first to CertBench", () => {
    const advice = PRACTICE_TEST_PAGES.flatMap((p) => p.faqs).filter((f) => /first\?$| before /.test(f.question));
    expect(advice.length).toBeGreaterThanOrEqual(4);
    for (const { question, answer } of advice) expect(answer, question).toMatch(/CertBench suggests/);
  });
});

describe("what the practice-test pages say is free", () => {
  // The four pages that answer "is this free" in their own words.
  const FREE_QUESTION = /\bfree\b/i;
  const pages = PRACTICE_TEST_PAGES.filter((p) => p.faqs.some((f) => FREE_QUESTION.test(f.question)));

  it("is asked on the Network+ page and on all three A+ pages", () => {
    expect(pages.map((p) => p.path).sort()).toEqual([
      "a-plus-core-1-practice-test",
      "a-plus-core-2-practice-test",
      "a-plus-practice-test",
      "network-plus-practice-test",
    ]);
  });

  it("answers with the free full-length exam of 90 questions and the 12 free labs", () => {
    for (const p of pages) {
      const answer = p.faqs.find((f) => FREE_QUESTION.test(f.question))!.answer;
      expect(answer, p.path).toMatch(/free full-length practice exam of 90 questions with a time limit of 90 minutes/);
      expect(answer, p.path).toContain("a free account shows the score");
      expect(answer, p.path).toContain("12 free hands-on labs, three of them with no account");
      // Pro adds further exams: it is never the way to a first full-length exam.
      expect(answer, p.path).toContain("further full-length timed exams");
    }
  });

  it("sends a reader of each page's opening lines to the practice exam, not past it", () => {
    for (const p of PRACTICE_TEST_PAGES) {
      expect(p.intro.join(" "), p.path).toMatch(/free full-length practice exam/);
      // The opening lines are printed under the questions, so they never point up or down the page.
      expect(p.intro.join(" "), p.path).not.toMatch(/\b(?:above|below)\b/);
    }
  });
});
