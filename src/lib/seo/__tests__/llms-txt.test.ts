import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRO_PRICE_TERMS, PRO_SCOPE_TERMS } from "@/lib/pricing/terms";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  EXAM_FACTS_CHECKED,
  NETWORK_PLUS_CERT,
  OBJECTIVE_HUB_CERTS,
  SECURITY_PLUS_CERT,
  SY0_801_CERT,
  UNPUBLISHED_PAGE_CERTS,
} from "../exam-versions";

/**
 * public/llms.txt is the summary of the site that tools read in place of the
 * pages. It is plain text, so it cannot import a constant: these checks keep
 * its links, its price and its dates in step with the routes and the tables.
 * The format is the llms.txt proposal's: one H1, a blockquote summary, free
 * text, and then H2 sections that hold only links.
 */
const ROOT = process.cwd();
const TEXT = readFileSync(join(ROOT, "public", "llms.txt"), "utf8");
const LINES = TEXT.split(/\r?\n/);
const SITE = "https://certbench.dev";
const CERTS = [SECURITY_PLUS_CERT, SY0_801_CERT, NETWORK_PLUS_CERT, A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT];
const LINK_ITEM = /^- \[[^\]]+\]\((https:\/\/certbench\.dev[^)\s]*)\): \S.*\.$/;

/** Whether an address in the file is a page this branch serves. */
function isRoute(path: string): boolean {
  const app = join(ROOT, "src", "app");
  const [, section, slug, ...rest] = path.split("/");
  if (rest.length > 0) return false;
  if (section === "path") return CERTS.includes(slug) && existsSync(join(app, "(path)", "path", "[cert]", "page.tsx"));
  if (section === "objectives") return OBJECTIVE_HUB_CERTS.includes(slug);
  if (section === "readiness-check") return CERTS.includes(slug) && !UNPUBLISHED_PAGE_CERTS.includes(slug);
  return existsSync(join(app, "(marketing)", ...path.split("/").filter(Boolean), "page.tsx"));
}

describe("llms.txt", () => {
  it("opens with one H1 and a blockquote summary", () => {
    expect(LINES[0]).toBe("# CertBench");
    expect(LINES.filter((line) => /^# /.test(line))).toHaveLength(1);
    expect(LINES[2]).toMatch(/^> CertBench is an independent study program /);
    expect(LINES.filter((line) => /^#{3,} /.test(line))).toEqual([]);
  });

  it("keeps only link items inside its H2 sections, each with a sentence after the link", () => {
    const firstSection = LINES.findIndex((line) => line.startsWith("## "));
    expect(firstSection).toBeGreaterThan(2);
    const stray = LINES.slice(firstSection).filter(
      (line) => line.trim() !== "" && !line.startsWith("## ") && !LINK_ITEM.test(line)
    );
    expect(stray).toEqual([]);
  });

  it("links only to pages that this site serves", () => {
    const urls = [...TEXT.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(30);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((url) => !url.startsWith(`${SITE}/`) || !isRoute(url.slice(SITE.length)))).toEqual([]);
  });

  it("leads with the pages that hold text, and lists the study-path screens last", () => {
    const sections = LINES.filter((line) => line.startsWith("## "));
    expect(sections[0]).toBe("## Free practice tests");
    expect(sections.at(-1)).toBe("## Study paths (the interactive program)");
    const last = LINES.slice(LINES.lastIndexOf(sections.at(-1)!) + 1).filter((line) => line.trim() !== "");
    expect(last).toHaveLength(CERTS.length);
    for (const line of last) expect(line).toContain(`${SITE}/path/`);
    // No study-path screen is linked from an earlier section.
    expect(TEXT.match(/certbench\.dev\/path\//g)).toHaveLength(CERTS.length);
  });

  it("states the price and what one plan covers in the words of the pricing terms", () => {
    expect(TEXT).toContain(`What Pro costs: ${PRO_PRICE_TERMS} ${PRO_SCOPE_TERMS}`);
    // Every dollar figure in the file belongs to that one wording.
    const withoutTerms = TEXT.split(PRO_PRICE_TERMS).join("");
    expect(withoutTerms).not.toMatch(/\$\d/);
    expect(TEXT.split(PRO_PRICE_TERMS).length - 1).toBe(2);
  });

  it("says what is free: the full-length practice exam and the 12 labs", () => {
    expect(TEXT).toContain(
      "Each exam has a free full-length practice exam of 90 questions with a time limit of 90 minutes"
    );
    expect(TEXT).toContain("each have 12 free hands-on labs, graded with partial credit, and the first three need no account.");
  });

  // "Hands-on lab" is CertBench's name for its own labs; a PBQ is CompTIA's name
  // for the exam's task. The tools are described by what they hold, and not by
  // what an exam covers.
  it("names CertBench's labs as hands-on labs, and describes the tools by what they hold", () => {
    expect(TEXT).not.toMatch(/interactive (?:\S+ )?PBQs|interactive performance-based/);
    expect(TEXT).toContain("The labs are CertBench's practice for the performance-based questions (PBQs) that the exams include.");
    expect(TEXT).not.toMatch(/the full list|that the CompTIA exams cover/i);
    expect(TEXT).toContain("A list of 307 acronyms for SY0-701, each with one meaning");
    // Each A+ core is summarized by all of its domains, troubleshooting in both.
    expect(TEXT).toContain("virtualization and cloud computing, and hardware and network troubleshooting.");
    expect(TEXT).toContain("Operating systems, security, software troubleshooting and operational procedures.");
  });

  // CompTIA's exam pages say that the exams have performance-based questions and
  // nothing about what they ask, so the summary says what the labs are.
  it("says what the hands-on labs are, and not that they work like the exam's questions", () => {
    expect(LINES[2]).toContain("hands-on labs in which you carry out tasks in the browser");
    expect(TEXT).not.toMatch(/work like performance-based|works like/);
  });

  it("dates its exam facts with the day CompTIA's pages were read", () => {
    const dated = TEXT.match(/were last checked against CompTIA's exam pages on ([A-Z][a-z]+ \d{1,2}, \d{4})\./);
    expect(dated?.[1]).toBe(EXAM_FACTS_CHECKED);
    expect(TEXT).toContain("SY0-801 (Security+ V8) launched on November 17, 2026");
    expect(TEXT).toContain("SY0-701 stays open until June 11, 2027 in English");
  });

  it("uses the site's vocabulary", () => {
    // Addresses hold "/path/" and "practice-test", which are not copy.
    const words = TEXT.replace(/\(https?:\/\/[^)\s]+\)/g, "");
    expect(words).not.toMatch(/(?<!study )\bpaths?\b/i);
    expect(words).not.toMatch(/\bguided\b|\bstops?\b|warm-?up|\brehearsal|\bsit(?:ting)?\b|\blog in\b|&/i);
    expect(words).not.toMatch(/\b(?:don't|doesn't|isn't|can't|won't|you'll|it's|that's|there's)\b/i);
  });
});
