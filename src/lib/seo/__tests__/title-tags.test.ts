import { describe, expect, it } from "vitest";
import { PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "../cert-pages";
import { ROUNDUPS, VS_PAGES } from "../comparison-pages";

/**
 * A title tag is the line a search result or a citation shows for a page. It
 * is written like every heading on the site: in sentence case, with "and"
 * spelled out. These are the titles and headings kept in the copy tables.
 */
const TITLES: { where: string; text: string }[] = [
  ...PRACTICE_TEST_PAGES.flatMap((p) => [
    { where: `${p.path} title`, text: p.title },
    { where: `${p.path} metaTitle`, text: p.metaTitle },
    { where: `${p.path} h1`, text: p.h1 },
  ]),
  ...PBQ_EXAMPLE_PAGES.flatMap((p) => [
    { where: `${p.path} title`, text: p.title },
    { where: `${p.path} metaTitle`, text: p.metaTitle },
    { where: `${p.path} h1`, text: p.h1 },
  ]),
  ...VS_PAGES.flatMap((p) => [
    { where: `${p.slug} metaTitle`, text: p.metaTitle },
    { where: `${p.slug} h1`, text: p.h1 },
  ]),
  ...ROUNDUPS.flatMap((r) => [
    { where: `${r.path} metaTitle`, text: r.metaTitle },
    { where: `${r.path} h1`, text: r.h1 },
  ]),
];

/** A product's own name keeps its capitals wherever it stands. */
const PRODUCT_NAMES = /CertMaster Practice|Pocket Prep|Boson ExSim/g;
/** The common words that Title Case would raise. The first word of a title is allowed its capital. */
const RAISED =
  /\b(?:Free|Interactive|Practice|Tests?|Exams?|Questions?|Examples?|Best|Compared|Guide|Quiz|And|For|In|To|Vs|With)\b/;

describe("titles and headings in the copy tables", () => {
  it("covers the practice-test pages, the PBQ pages, the comparisons and the guides", () => {
    expect(TITLES.length).toBeGreaterThanOrEqual(30);
  });

  it("are in sentence case", () => {
    const raised = TITLES.filter(({ text }) => {
      const afterFirstWord = text.replace(PRODUCT_NAMES, "").replace(/^\S+\s*/, "");
      return RAISED.test(afterFirstWord);
    });
    expect(raised).toEqual([]);
  });

  it("spell out \"and\"", () => {
    expect(TITLES.filter(({ text }) => text.includes("&"))).toEqual([]);
  });

  it("open with a capital letter or a figure", () => {
    expect(TITLES.filter(({ text }) => !/^[A-Z0-9]/.test(text))).toEqual([]);
  });

  // A search result shows about 60 characters of a title tag, and the root
  // layout adds " | CertBench" to every one of these. The Network+ guide's ran
  // to 66 and was cut short.
  // Search and AI answers quote a description as it stands, so each is written
  // in sentences that say who offers what. They opened with noun phrases ("Free
  // full-length Security+ SY0-701 practice exam: 90 questions in 90 minutes").
  it("describe the practice-test and PBQ pages in sentences that open with who offers the page", () => {
    const descriptions = [...PRACTICE_TEST_PAGES, ...PBQ_EXAMPLE_PAGES].map((p) => ({ where: p.path, text: p.metaDescription }));
    expect(descriptions).toHaveLength(9);
    expect(descriptions.filter(({ text }) => !/^(?:CertBench offers|This page has) .*\.$/.test(text))).toEqual([]);
  });

  it("make title tags of no more than 60 characters with the brand that the layout adds", () => {
    const tags = TITLES.filter(({ where }) => where.endsWith("metaTitle")).map(({ where, text }) => ({
      where,
      tag: `${text} | CertBench`,
    }));
    expect(tags.length).toBeGreaterThanOrEqual(15);
    expect(tags.filter(({ tag }) => tag.length > 60)).toEqual([]);
  });
});
