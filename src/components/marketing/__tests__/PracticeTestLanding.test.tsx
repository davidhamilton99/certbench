// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ChoiceRep, PathStructure, PublicTestData, QuickRoundData } from "@/core/path/types";

// Server render only: nothing here signs anyone in or reaches an API.
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
// The introductory questions are another component's business: a marker stands in for them.
vi.mock("@/components/path/QuickRound", () => ({
  QuickRound: ({ label }: { label: string }) => <div data-testid="round">{label}</div>,
}));

import { PracticeTestLanding, type ObjectiveLink, type PracticeTestLandingData } from "../PracticeTestLanding";
import { CERT_PAGES_UPDATED_ISO, PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";

const pageFor = (path: string) => PRACTICE_TEST_PAGES.find((p) => p.path === path)!;

function structure(certSlug: string, examName: string, examCode: string): PathStructure {
  return {
    certSlug,
    examName,
    examCode,
    domains: [
      {
        number: "1.0",
        title: "First domain",
        weight: 40,
        objectives: [{ code: "1.1", title: "Compare the first things" }],
      },
      {
        number: "2.0",
        title: "Second domain",
        weight: 60,
        objectives: [{ code: "2.1", title: "Explain the second things" }],
      },
    ],
  };
}

const reps = (n: number): ChoiceRep[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `bank-${i}`,
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective: i % 5 < 2 ? "1.1" : "2.1",
    prompt: `Bank question ${i}, which is long enough to be told from any other?`,
    options: ["First", "Second", "Third", "Fourth"],
    answer: 0,
    takeaway: `Takeaway ${i}.`,
  }));

function fixture(certSlug: string, examName: string, examCode: string, certName: string) {
  const s = structure(certSlug, examName, examCode);
  const data: PracticeTestLandingData = {
    certs: [
      {
        cert: { id: "c1", name: certName, examCode },
        domains: s.domains.map((d, i) => ({ id: `d${i}`, domainNumber: d.number, title: d.title, examWeight: d.weight })),
      },
    ],
    totalQuestions: 1842,
    sampleGroups: [
      {
        certName,
        examCode,
        questions: [
          { questionText: "A sample question?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Because B." },
          { questionText: "A longer sample question?", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "Because A." },
        ],
      },
    ],
  };
  const round = {
    cert: certSlug,
    examName,
    title: "Introductory questions",
    reps: reps(8),
    structure: s,
  } as QuickRoundData;
  const test: PublicTestData = { testId: certSlug, structure: s, size: "full", reps: reps(90) };
  const objectives: ObjectiveLink[] = [
    { certSlug, code: "1.1", title: "Compare the first things", topic: "First things", slug: "1-1" },
    { certSlug, code: "2.1", title: "Explain the second things", topic: "Second things", slug: "2-1" },
  ];
  return { data, round, test, objectives };
}

/** The page as served, parsed: what search and a visitor with scripts off get. */
function served(element: React.ReactElement): { doc: Document; html: string } {
  const html = renderToString(element);
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Structured data is not something a visitor reads.
  doc.querySelectorAll("script").forEach((s) => s.remove());
  return { doc, html };
}

const text = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The facts in the summary list under the title, as label and value. */
const facts = (doc: Document) =>
  [...doc.querySelectorAll("dl > div")].map((row) => [text(row.querySelector("dt")), text(row.querySelector("dd"))]);

/** The small lines that stand directly over a heading. */
const linesOverHeadings = (doc: Document) =>
  [...doc.querySelectorAll("p.cb-label")]
    .filter((p) => /^H[1-3]$/.test(p.nextElementSibling?.tagName ?? ""))
    .map(text);

describe("a practice-test page for one exam", () => {
  const page = pageFor("security-plus-practice-test");
  const { data, round, test, objectives } = fixture("security-plus-sy0-701", "Security+", "SY0-701", "CompTIA Security+");
  const render = () =>
    served(<PracticeTestLanding page={page} data={data} objectives={objectives} round={round} test={test} />);

  it("renders its content only, with one title", () => {
    const { doc } = render();
    // The header, the main region and the footer are drawn once, by the layout.
    expect(doc.querySelector("main, header, footer")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(text(doc.querySelector("h1"))).toBe(page.h1);
  });

  it("names CertBench and the exam in the sentences that carry the offer", () => {
    const { doc } = render();
    const body = text(doc.body);
    expect(body).toContain(
      "CertBench offers a free full-length practice exam for Security+ SY0-701. It has 90 questions and a time limit of 90 minutes. You do not need an account to start, and a free account shows your score. You can begin with 8 introductory questions."
    );
    expect(body).toContain(
      "The CertBench practice exam for Security+ SY0-701 has 90 questions and a time limit of 90 minutes, which is the limit of the real exam. You can also take a half-length exam of 45 questions. As in the real exam, answers are not shown until the end. Every question is then explained with your score."
    );
  });

  it("sets the facts under the title as a summary list, each with its label", () => {
    const { doc } = render();
    expect(facts(doc)).toEqual([
      ["Questions", "90"],
      ["Time limit", "90 minutes"],
      ["Scoring", "By domain"],
      ["Question bank", "1,842 questions"],
    ]);
  });

  it("keeps a small line over a heading only where it holds a fact the heading does not", () => {
    const { doc } = render();
    // The count of objectives is such a fact. The exam's code is in the title already.
    expect(linesOverHeadings(doc)).toEqual(["2 objectives"]);
    expect(text(doc.body)).not.toContain("Full-length timed practice exam");
    // The exam's own section calls it a practice exam throughout.
    expect(text(doc.getElementById("practice-test"))).not.toMatch(/practice test/i);
  });

  it("leads from the opening lines to the practice exam, which is further down the page", () => {
    const { doc } = render();
    const jump = [...doc.querySelectorAll("a")].find((a) => text(a) === "Go to the practice exam");
    expect(jump?.getAttribute("href")).toBe("#practice-test");
    const section = doc.getElementById("practice-test");
    expect(text(section?.querySelector("h2"))).toBe("Free Security+ practice exam");
    // The link comes before the introductory questions; the exam after them.
    const round = doc.querySelector('[data-testid="round"]')!;
    expect(jump!.compareDocumentPosition(round) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(round.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No heading inside the section outranks the section's own.
    expect(text(section?.querySelector("h3"))).toBe("90 questions in 90 minutes");
  });

  it("dates its structured data with the day the page's words last changed", () => {
    const { html } = render();
    const resource = [...new DOMParser().parseFromString(html, "text/html").querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}") as Record<string, unknown>)
      .find((d) => d["@type"] === "LearningResource");
    // The same day as the sitemap gives for the page: both read the date kept beside the page's words.
    expect(resource?.dateModified).toBe(CERT_PAGES_UPDATED_ISO);
    expect(CERT_PAGES_UPDATED_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("says that the study path covers every exam objective, where the objectives are CompTIA's own", () => {
    const { doc } = render();
    expect(text(doc.body)).toContain(
      "The study path covers every exam objective in short sets of questions like these. A readiness checkpoint then shows where you stand."
    );
  });

  it("serves every question of the exam with its answer, folded, and each of them once", () => {
    const { doc, html } = render();
    const section = doc.getElementById("practice-test")!;
    const list = [...section.querySelectorAll("details")].find((d) =>
      text(d.querySelector("summary")).startsWith("All 90 questions, with answers")
    );
    expect(list).toBeTruthy();
    expect(list!.hasAttribute("open")).toBe(false);
    expect(list!.querySelectorAll("ol > li")).toHaveLength(90);
    expect(text(list!.querySelector("ol > li"))).toContain("1.1 Compare the first things");
    expect(text(list!.querySelector("ol > li"))).toContain("Answer: A. First.");
    // Once in the page as it is served: the list is built from the exam's own questions.
    expect(html.split("Bank question 77, which is long enough").length - 1).toBe(1);
  });
});

describe("a practice-test page whose objective numbers are not CompTIA's", () => {
  it("names each objective without a number, in the links and in the exam's list", () => {
    const page = pageFor("network-plus-practice-test");
    const { data, round, test, objectives } = fixture("network-plus-n10-009", "Network+", "N10-009", "CompTIA Network+");
    const { doc } = served(
      <PracticeTestLanding page={page} data={data} objectives={objectives} round={round} test={test} />
    );
    expect(text(doc.body)).toContain("Practice by topic");
    expect(linesOverHeadings(doc)).toEqual(["2 topics"]);
    const first = doc.getElementById("practice-test")!.querySelector("details ol > li");
    expect(text(first)).toContain("Compare the first things");
    expect(text(first)).not.toContain("1.1 Compare the first things");
  });

  it("says topic, and never that the study path covers every exam objective", () => {
    const page = pageFor("network-plus-practice-test");
    const { data, round, test, objectives } = fixture("network-plus-n10-009", "Network+", "N10-009", "CompTIA Network+");
    const { doc } = served(
      <PracticeTestLanding page={page} data={data} objectives={objectives} round={round} test={test} />
    );
    const body = text(doc.body);
    expect(body).toContain(
      "The study path covers every topic in short sets of questions like these. A readiness checkpoint then shows where you stand."
    );
    // Its topics are CertBench's own grouping, so the page claims no mapping to CompTIA's numbered objectives.
    expect(body).not.toMatch(/every (?:exam )?objective|mapped to the same|written against the N10-009 objectives/);
    expect(body).toContain("They are original questions written for the N10-009 exam at exam-level difficulty.");
  });
});

describe("the practice-test page for an exam taken in two parts", () => {
  const page = pageFor("a-plus-practice-test");
  const { data } = fixture("a-plus-core1-220-1201", "A+ Core 1", "220-1201", "CompTIA A+ Core 1");

  it("offers each part's own practice-test page first, as plain rows", () => {
    const { doc } = served(<PracticeTestLanding page={page} data={data} />);
    const body = text(doc.body);
    expect(body).toContain(
      "CertBench offers free exam-style questions for A+ 220-1201 and 220-1202. Each one is explained as soon as you answer."
    );
    // The title does not hold the two codes, so they stand over it.
    expect(linesOverHeadings(doc)).toEqual(["220-1201 and 220-1202"]);
    const cores = page.cores!.map((core) => [...doc.querySelectorAll("a")].find((a) => a.getAttribute("href") === core.href)!);
    expect(text(cores[0])).toContain("A+ Core 1 practice test (220-1201)");
    expect(text(cores[1])).toContain("A+ Core 2 practice test (220-1202)");
    // Each row says what the part covers, and no arrow is drawn on a row.
    expect(text(cores[0])).toContain(page.cores![0].blurb);
    for (const row of cores) expect(row.querySelector("svg")).toBeNull();
    // This page has no exam of its own to go to.
    expect(body).not.toContain("Go to the practice exam");
    expect(facts(doc)).toEqual([
      ["Question bank", "1,842 questions"],
      ["Explanations", "With every answer"],
      ["Price", "Free"],
    ]);
  });
});
