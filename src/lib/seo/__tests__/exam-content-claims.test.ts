import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CompTIA does not publish what its exams are made of: which topics its
 * performance-based questions test, how often a topic comes up, or what share
 * of an exam is scenarios. Its exam materials are confidential (CompTIA
 * Candidate Agreement, section 8, in the facts file). A public page may say
 * what one of CompTIA's objectives documents lists, once that line has been
 * read at the source and recorded, and what CertBench itself offers. It may
 * not say what an exam expects, asks most, depends on or is decided by.
 *
 * These are the sentences that the review of 23 November 2026 found on the
 * tool pages and the guides (WF-01, the lead's item 3 and WF-03), in the forms
 * they were written in, so that none of them comes back. Every file a public
 * page is built from is read here, as one line of text.
 */
const ROOT = process.cwd();
const PUBLIC_COPY = [
  "src/app/(marketing)",
  "src/app/(path)",
  "src/app/(workspace)/upgrade",
  "src/components/billing",
  "src/app/readiness",
  "src/app/share",
  "src/app/layout.tsx",
  "src/components/marketing",
  "src/components/home",
  "src/components/path",
  // Signed in, but its note and its page spoke of what the exam is made of (FW-06, 23 November 2026).
  "src/components/recall",
  "src/app/(workspace)/recall",
  "src/lib/seo",
  "public/llms.txt",
];

const CLAIMS: { claim: string; pattern: RegExp }[] = [
  { claim: "what every exam expects", pattern: /\bevery CompTIA exam expects\b/i },
  { claim: "what an exam expects you to know", pattern: /\b(?:exams?|Network\+|Security\+|A\+) expects? you to\b/i },
  { claim: "which ports CompTIA tests", pattern: /\b(?:ports|port numbers) that (?:CompTIA|the exams?) tests?\b/i },
  { claim: "what an exam tests", pattern: /\b(?:Network\+|Security\+|A\+)(?: \([A-Z0-9-]+\))? tests\b/ },
  { claim: "what an exam tests most", pattern: /\bmost heavily\b/i },
  { claim: "what an exam often asks", pattern: /\boften asks\b/i },
  { claim: "a topic said to be in performance-based questions", pattern: /\bappears? in performance-based questions\b/i },
  { claim: "what share of an exam a topic is", pattern: /\bsmall part of the exam\b/i },
  {
    claim: "what the rest of an exam is made of",
    pattern: /\bmost of the exam consists of\b|\bthe exam is decided by\b|\brest of the exam decides\b/i,
  },
  { claim: "how many questions use a term", pattern: /\bappear in many questions\b|\brelies heavily on\b|\bthe exam uses most\b/i },
  { claim: "what an exam depends on", pattern: /\b(?:Network\+|Security\+|A\+|the exam) depends on\b/i },
  { claim: "a drill described as dragged, though nothing on the site drags", pattern: /\bdrag-and-drop (?:drills?|formats?)\b/i },
  // Statements about CompTIA and its exams that the facts file does not hold (WF-17, WF-18 and WF-06).
  { claim: "how the real exam behaves", pattern: /\bas in the real exam\b|\bat the real pace\b/i },
  { claim: "how difficult the real exam is", pattern: /\bexam-level difficulty\b/i },
  { claim: "that both Security+ versions lead to one certification", pattern: /\bboth versions lead to the same\b/i },
  { claim: "that the A+ cores may be taken in any order", pattern: /\bthere is no rule\b|\bin either order\b|\bin whichever order\b/i },
  { claim: "who writes another product's questions", pattern: /\bCompTIA writes\b/i },
  { claim: "what carried over from one exam version to the next", pattern: /\bmost topics carr(?:y|ied) over\b/i },
  { claim: "a CompTIA conversion of the score", pattern: /\bdoes not publish the percentage\b/i },
  { claim: "what the N10-009 objectives include", pattern: /\bN10-009\)? exam objectives include\b|\bpart of the N10-009 exam objectives\b/i },
  { claim: "what else the exam sets", pattern: /\bthe exam also sets\b|\bRecall is one part of the exam\b/i },
  { claim: "what a learner must know for the exam", pattern: /\bthat you must know from memory\b/i },
];

/**
 * The same sentences in files that another engineer is correcting in the same
 * round of work (R5-LABS, 23 November 2026). Such a file may be corrected at
 * any moment, so no check insists that it still needs its line. Delete the
 * line once the file is right: the guard then covers it.
 */
const IN_OTHER_HANDS: Record<string, string> = {};

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(child);
    return /\.(tsx?|txt)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

// A sentence in a page's source runs over several lines, so each file is read as one line of text.
const COPY = PUBLIC_COPY.flatMap((p) => files(join(ROOT, p))).map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8").replace(/\s+/g, " "),
}));

const found = (copy: { path: string; text: string }[]) =>
  copy.flatMap(({ path, text }) =>
    CLAIMS.flatMap(({ claim, pattern }) => {
      const match = text.match(pattern);
      return match ? [{ path, said: `${path}: ${claim} ("${match[0]}")` }] : [];
    })
  );

describe("what the public pages say about the content of CompTIA's exams", () => {
  it("reads the pages that make such claims", () => {
    const paths = COPY.map((c) => c.path);
    for (const page of [
      "src/app/(marketing)/tools/port-numbers-quiz/page.tsx",
      "src/app/(marketing)/tools/subnetting-practice/page.tsx",
      "src/app/(marketing)/tools/security-plus-acronyms-quiz/page.tsx",
      "src/lib/seo/comparison-pages.ts",
      "src/lib/seo/cert-pages.ts",
      "public/llms.txt",
    ]) {
      expect(paths, page).toContain(page);
    }
  });

  it("says nothing that CompTIA does not publish about what an exam asks or is made of", () => {
    expect(found(COPY).filter(({ path }) => !(path in IN_OTHER_HANDS)).map(({ said }) => said)).toEqual([]);
    for (const path of Object.keys(IN_OTHER_HANDS)) expect(existsSync(join(ROOT, path)), path).toBe(true);
  });

  it("knows each claim in the form it was written in, and not the sentences that replaced it", () => {
    const said = [
      "Recall is one part of the exam.",
      "The exam also sets scenario questions and performance-based questions.",
      "Recall drills the Network+ facts that you must know from memory.",
      "Every CompTIA exam expects you to know the port numbers from memory.",
      "This quiz covers the 35 ports that CompTIA tests.",
      "This quiz covers the 35 ports that the exams test, in both directions.",
      "Network+ tests ports most heavily.",
      "Network+ (N10-009) tests subnetting directly.",
      "Security+ often asks which secure protocol replaces an insecure one.",
      "It appears in performance-based questions.",
      "Port numbers are a small part of the exam.",
      "Most of the exam consists of scenarios.",
      "The exam is decided by scenarios from every domain.",
      "The rest of the exam decides whether you pass.",
      "Some of them appear in many questions.",
      "The Security+ SY0-701 exam relies heavily on acronyms.",
      "The acronyms that the exam uses most",
      "The port numbers that the Network+ exam expects you to know",
      "Security+ expects you to read CIDR notation.",
      "The timed calculations that Network+ depends on",
      "A drill for every drag-and-drop format.",
      "As in the real exam, answers are not shown until the end.",
      "Original questions written for the N10-009 exam at exam-level difficulty.",
      "Both versions lead to the same Security+ certification.",
      "There is no rule, however, and you can take them in whichever order suits your study plan.",
      "The cores are separate exams that you can take in either order.",
      "CompTIA writes CertMaster's questions.",
      "Most topics carried over and the objectives were renumbered.",
      "CompTIA does not publish the percentage of questions that this represents.",
      "The Network+ (N10-009) exam objectives include subnetting, ports and protocols.",
      "Subnetting, ports and protocols are part of the N10-009 exam objectives.",
    ];
    expect(said.filter((text) => found([{ path: "x", text }]).length === 0)).toEqual([]);
    const notSaid = [
      "This quiz covers 35 ports for the CompTIA exams, asked in both directions.",
      "For A+ Core 1 (220-1201), CompTIA's exam objectives list the ports and protocols under objective 2.1.",
      "CompTIA's exam questions are confidential, so it publishes no list of PBQ topics.",
      "Subnetting is one topic of the Network+ study path.",
      "Study for your exam in short steps.",
      "Free subnetting and port-number drills against the clock.",
      "The best Network+ practice tests and exams in 2026",
      "Ordering, matching and sorting drills.",
      "Answers are not shown until you finish, and every question is then explained with your score.",
      "CompTIA's 220-1201 objectives say that the troubleshooting methodology itself is no longer tested.",
      "CompTIA does not publish the number.",
      "CertBench's Network+ study path has topics on IP addressing and subnets and on ports and protocols.",
    ];
    expect(notSaid.filter((text) => found([{ path: "x", text }]).length > 0)).toEqual([]);
  });
});
