import { describe, expect, it } from "vitest";
import { PRO_PRICE_SHORT, PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "../cert-pages";
import { A_PLUS_ROUNDUP, NETWORK_PLUS_ROUNDUP, ROUNDUP, ROUNDUPS, VS_PAGES, type RoundupTool } from "../comparison-pages";

/**
 * The guides and the comparisons are published by CertBench and include
 * CertBench. These checks hold the three things that make such a page honest:
 * it says who publishes it wherever it can be quoted, a competitor's price
 * carries a date only when it was read at the source, and CertBench's own
 * price is the one wording of src/lib/pricing/terms.ts.
 */
const LONG_DATE = /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;
const HEDGED = /^(?:Typically|Often) /;
const tools = (guide: { tools: RoundupTool[] }) => guide.tools;
const find = (guide: { tools: RoundupTool[] }, name: RegExp) => tools(guide).find((tool) => name.test(tool.name));

describe("the guides to practice tests", () => {
  it("say who publishes them in the description, the opening line and the publisher's own entry", () => {
    for (const guide of ROUNDUPS) {
      expect(guide.metaDescription, guide.path).toMatch(/^CertBench publishes this guide to /);
      expect(guide.intro[0], guide.path).toContain("CertBench publishes this guide, and CertBench is on this list.");
      expect(tools(guide).filter((tool) => tool.isSelf).map((tool) => tool.name), guide.path).toEqual(["CertBench"]);
    }
  });

  it("count their products correctly where the description gives a number", () => {
    expect(ROUNDUP.metaDescription).toContain("one of the six products");
    expect(ROUNDUP.tools).toHaveLength(6);
    expect(A_PLUS_ROUNDUP.metaDescription).toContain("one of the six products");
    expect(A_PLUS_ROUNDUP.tools).toHaveLength(6);
  });

  // The publisher of a guide is in no position to place its own product, so
  // the products are in an order that ranks nobody, and the guide says so.
  it("list their products in alphabetical order, and say that they do", () => {
    for (const guide of ROUNDUPS) {
      const names = tools(guide).map((tool) => tool.name);
      expect(names, guide.path).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
      expect(guide.intro.join(" "), guide.path).toContain("The products are listed in alphabetical order.");
      // CertBench is never first in its own guide.
      expect(names[0], guide.path).not.toBe("CertBench");
    }
  });

  it("name the products in the description in the order of the list", () => {
    expect(ROUNDUP.metaDescription).toContain("Boson, CertBench, CertMaster, Dion Training, ExamCompass and Professor Messer.");
    expect(A_PLUS_ROUNDUP.metaDescription).toContain("Boson, CertBench, CertMaster, Jason Dion, Professor Messer and TotalTester.");
    expect(NETWORK_PLUS_ROUNDUP.metaDescription).toContain("Boson, CertBench, CertMaster and Jason Dion, and covers subnetting practice.");
  });

  it("say whose judgments the entries are, and which prices were read at the source", () => {
    for (const guide of ROUNDUPS) {
      const intro = guide.intro.join(" ");
      expect(intro, guide.path).toContain("are CertBench's own assessment");
      expect(intro, guide.path).toContain("CertBench read it on the vendor's own page on that date");
      expect(intro, guide.path).toContain("The other prices are approximate and may have changed.");
    }
  });

  it("open every answer that names CertBench with the disclosure, so the answer can be quoted alone", () => {
    for (const guide of ROUNDUPS) {
      for (const { question, answer } of guide.faqs) {
        if (!answer.includes("CertBench")) continue;
        expect(answer, `${guide.path}: ${question}`).toMatch(/^CertBench publishes this guide, so this answer is its own view\. /);
      }
    }
  });

  it("date a competitor's price only when it was read on the vendor's own page", () => {
    for (const guide of ROUNDUPS) {
      for (const tool of tools(guide)) {
        const where = `${guide.path}: ${tool.name}`;
        expect(Boolean(tool.source), where).toBe(Boolean(tool.checked));
        if (tool.checked) {
          expect(tool.checked, where).toMatch(LONG_DATE);
          expect(tool.source, where).toMatch(/^https:\/\/(?!certbench\.dev)/);
          // A price that was read is stated exactly.
          expect(tool.price, where).toMatch(/\$\d/);
          expect(tool.price, where).not.toMatch(/typically|often|about|approximately|around/i);
        } else if (!tool.isSelf && tool.price !== "Free") {
          // A price that was not read is hedged, and has no date.
          expect(tool.price, where).toMatch(HEDGED);
        }
      }
    }
  });

  it("state the prices that were confirmed on November 22, 2026 in the confirmed wording", () => {
    for (const guide of ROUNDUPS) {
      const boson = find(guide, /^Boson/)!;
      expect(boson.price, guide.path).toBe("$99 a year for each exam");
      expect(boson.source, guide.path).toMatch(/^https:\/\/boson\.com\/certifications\/comptia-/);
    }
    expect(find(ROUNDUP, /Professor Messer/)!.price).toBe("$30 for the digital edition, three practice exams of 90 questions");
    expect(find(ROUNDUP, /Dion Training/)!.price).toBe("$29.99 for the practice exam pack, sold directly");
    expect(find(A_PLUS_ROUNDUP, /TotalTester/)!.price).toBe("$69 for Core 1 and Core 2");
    expect(find(A_PLUS_ROUNDUP, /Professor Messer/)!.price).toMatch(/^\$30 for the digital edition of each core/);
  });

  it("leave prices that could not be read without a date", () => {
    const unread = ROUNDUPS.flatMap((guide) => tools(guide)).filter((tool) => /CertMaster|Udemy|ExamCompass|Subnetting\.org/.test(tool.name));
    expect(unread.length).toBeGreaterThanOrEqual(6);
    for (const tool of unread) {
      expect(tool.checked, tool.name).toBeUndefined();
      expect(tool.source, tool.name).toBeUndefined();
    }
  });

  it("describe no Professor Messer practice exams for Network+, because none was found on his N10-009 page", () => {
    expect(find(NETWORK_PLUS_ROUNDUP, /Messer/)).toBeUndefined();
    expect(JSON.stringify(NETWORK_PLUS_ROUNDUP)).not.toMatch(/Messer/);
  });
});

describe("the comparisons with one other product", () => {
  it("say who publishes them in the description and the opening line", () => {
    for (const page of VS_PAGES) {
      expect(page.metaDescription, page.slug).toMatch(/^CertBench's own comparison of CertBench and /);
      expect(page.intro[0], page.slug).toMatch(/^CertBench publishes this comparison, and the assessments in it are its own\. /);
    }
  });

  it("attach the disclosure to every answer that gives a judgment", () => {
    for (const page of VS_PAGES) {
      for (const { question, answer } of page.faqs) {
        if (!/recommends|assessment|its own view|worth/i.test(answer)) continue;
        expect(answer, `${page.slug}: ${question}`).toMatch(/publishes this comparison/);
      }
    }
  });

  it("date a competitor's price only when it was read on the vendor's own page", () => {
    for (const page of VS_PAGES) {
      expect(Boolean(page.priceSource), page.slug).toBe(Boolean(page.priceChecked));
      if (page.priceChecked) expect(page.priceChecked, page.slug).toMatch(LONG_DATE);
    }
    const price = (slug: string) => VS_PAGES.find((p) => p.slug === slug)!.rows.find((row) => row.feature === "Price")!.competitor;
    expect(price("certbench-vs-boson")).toBe("$99 a year for each exam");
    expect(price("certbench-vs-pocket-prep")).toContain("$20.99 a month, $49.99 every three months, or $124.99 a year");
    // CertMaster's price could not be read, so it is hedged and undated.
    expect(price("certbench-vs-certmaster")).toMatch(HEDGED);
    expect(VS_PAGES.find((p) => p.slug === "certbench-vs-certmaster")!.priceChecked).toBeUndefined();
  });
});

describe("CertBench's own price in the copy tables", () => {
  it("is the wording of the pricing terms wherever a table states it", () => {
    for (const guide of ROUNDUPS) expect(find(guide, /^CertBench$/)!.price, guide.path).toBe(PRO_PRICE_SHORT);
    for (const page of VS_PAGES) {
      expect(page.rows.find((row) => row.feature === "Price")!.certbench, page.slug).toBe(PRO_PRICE_SHORT);
    }
  });

  it("is never typed by hand", () => {
    const tables = JSON.stringify([ROUNDUPS, VS_PAGES, PRACTICE_TEST_PAGES, PBQ_EXAMPLE_PAGES])
      .split(PRO_PRICE_TERMS)
      .join("")
      .split(PRO_PRICE_SHORT)
      .join("");
    // What is left are competitors' prices: none of them is $19 or $39, and $99 is Boson's.
    expect(tables).not.toMatch(/\$(?:19|39)\b/);
    expect(tables).not.toMatch(/Pro (?:costs|is|from) \$/);
    for (const found of tables.match(/.{0,12}\$99\b.{0,24}/g) ?? []) expect(found).toContain("$99 a year for each exam");
  });

  it("is not stated on the practice-test pages or the PBQ pages, which leave it to the pricing terms", () => {
    expect(JSON.stringify([PRACTICE_TEST_PAGES, PBQ_EXAMPLE_PAGES])).not.toContain("$");
  });
});

describe("claims the tables do not make", () => {
  it("say nothing about what most candidates do or recommend", () => {
    const copy = JSON.stringify([ROUNDUPS, VS_PAGES]);
    expect(copy).not.toMatch(/most people|most candidates|most often recommended|r\/CompTIA|commonly report|industry benchmark/i);
  });
});
