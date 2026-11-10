import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import { PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "../cert-pages";
import { A_PLUS_ROUNDUP } from "../comparison-pages";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  replacedBy,
  SECURITY_PLUS_DOMAIN_CHANGES,
  usesOfficialObjectiveNumbers,
} from "../exam-versions";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("exam facts on the public pages", () => {
  it("has SY0-701 and SY0-801 domain weights that each add up to the whole exam", () => {
    expect(sum(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0701))).toBe(100);
    expect(sum(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801))).toBe(100);
  });

  it("lists current exams' domains that add up to the whole exam", () => {
    const outlines = PRACTICE_TEST_PAGES.flatMap((p) => p.currentExams ?? []);
    expect(outlines.length).toBeGreaterThan(0);
    for (const exam of outlines) {
      expect(sum(exam.domains.map((d) => d.weight)), exam.examCode).toBe(100);
    }
  });

  it("says A+ is written to today's exams, 220-1201 and 220-1202", () => {
    const page = PRACTICE_TEST_PAGES.find((p) => p.path === "a-plus-practice-test")!;
    expect(page.metaDescription).toContain("220-1201/1202");
    expect(page.currentExams?.map((e) => e.examCode)).toEqual(["220-1201", "220-1202"]);
    expect(page.faqs.map((f) => f.answer).join(" ")).toContain("retired on September 25, 2025");
    expect(A_PLUS_ROUNDUP.metaDescription).toContain("220-1201 & 220-1202");

    // Nothing says our A+ content is on the retired exams any more.
    const pbqPages = PBQ_EXAMPLE_PAGES.filter((p) => p.certSlug.startsWith("a-plus"));
    const copy = JSON.stringify([page, A_PLUS_ROUNDUP, pbqPages]);
    expect(copy).not.toMatch(/[Ww]ritten to (the retired )?220-110[12]|haven't added the new/);
    expect(replacedBy(A_PLUS_CORE1_CERT)).toBeNull();
    expect(replacedBy(A_PLUS_CORE2_CERT)).toBeNull();
    expect(replacedBy("security-plus-sy0-701")).toBeNull();
  });

  it("keeps Network+ off official objective numbers until they're re-mapped", () => {
    expect(usesOfficialObjectiveNumbers("network-plus-n10-009")).toBe(false);
    expect(usesOfficialObjectiveNumbers("security-plus-sy0-701")).toBe(true);
  });

  it("has playable scenarios behind every PBQ page", () => {
    for (const page of PBQ_EXAMPLE_PAGES) {
      expect(pbqRegistry[page.certSlug]?.length ?? 0, page.path).toBeGreaterThanOrEqual(3);
    }
  });
});
