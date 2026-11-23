// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ChoiceRep, PublicTestData } from "@/core/path/types";

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

const drawn = vi.hoisted(() => ({ current: null as PublicTestData | null }));
vi.mock("@/server/path/public-test", () => ({ loadPublicTest: async () => drawn.current }));

import Page, { generateMetadata } from "@/app/(marketing)/security-plus-sy0-801-practice-test/page";
import { SY0_801_DOMAINS } from "@/data/security-plus-v8";

/** A full-length draw from the bank: 90 questions, each objective covered, weighted by domain. */
function fullDraw(): PublicTestData {
  const objectives = SY0_801_DOMAINS.flatMap((d) => d.objectives.map((o) => o.code));
  const reps: ChoiceRep[] = Array.from({ length: 90 }, (_, i) => ({
    id: `bank-${i}`,
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective: objectives[i % objectives.length],
    prompt: `Bank question ${i}?`,
    options: ["A", "B", "C", "D"],
    answer: 0,
    takeaway: "Because.",
  }));
  const domains = SY0_801_DOMAINS.map((d) => ({
    number: d.number,
    title: d.title,
    weight: d.weight,
    objectives: d.objectives.map((o) => ({ code: o.code, title: o.label })),
  }));
  return {
    testId: "security-plus-sy0-801",
    structure: { certSlug: "security-plus-sy0-801", examName: "Security+", examCode: "SY0-801", domains },
    size: "full",
    reps,
  };
}

/** The page as served, parsed: what search and a visitor with scripts off get. */
async function served(): Promise<Document> {
  const doc = new DOMParser().parseFromString(renderToString(await Page()), "text/html");
  // Structured data is not something a visitor reads.
  doc.querySelectorAll("script").forEach((s) => s.remove());
  return doc;
}

const text = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();

/** A fact in the summary list under the title, by its label. */
function fact(doc: Document, label: string): string {
  const term = [...doc.querySelectorAll("dt")].find((dt) => text(dt) === label);
  return text(term?.nextElementSibling);
}

beforeEach(() => {
  drawn.current = null;
});

describe("the SY0-801 practice test page", () => {
  it("serves the full-length exam from the bank, and says who offers it and on what terms", async () => {
    drawn.current = fullDraw();
    const doc = await served();
    const page = text(doc.body);
    // The page is content only: the header, the main region and the footer come from the layout.
    expect(doc.querySelector("main, header, footer")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(text(doc.querySelector("h1"))).toBe("Free Security+ SY0-801 practice test");

    expect(page).toContain(
      "CertBench offers a free full-length practice exam for Security+ SY0-801. It has 90 questions and a time limit of 90 minutes, which is the limit of the real exam. You do not need an account to start, and a free account shows your score."
    );
    expect(page).toContain("You can also take a half-length exam of 45 questions, or answer 45 more questions one at a time.");
    // The facts under the title, each with its label.
    expect(fact(doc, "Questions")).toBe("90");
    expect(fact(doc, "Time limit")).toBe("90 minutes");
    expect(fact(doc, "Scoring")).toBe("By domain");
    expect(fact(doc, "Objectives covered")).toBe("27 of 27");

    // The exam's card, served ready to start, with the condition for the score in its own sentence.
    expect(text(doc.querySelector("h2"))).toBe("90 questions in 90 minutes");
    expect(page).toContain("The exam is free. When you finish, a free account shows your score by domain");
    expect(page).toContain("Take the exam with extended time: 135 minutes of extended time or 180 minutes of extended time.");

    // Each domain with its share of the exam and its questions in this practice exam.
    expect(page).toContain("The 90 questions are divided among the five domains in the proportions of the exam.");
    const rows = [...doc.querySelectorAll("table tbody tr")];
    expect(rows).toHaveLength(SY0_801_DOMAINS.length);
    expect(rows.map((tr) => text(tr.children[1]))).toEqual(SY0_801_DOMAINS.map((d) => `${d.weight}%`));
    expect(rows.reduce((n, tr) => n + Number(text(tr.children[2])), 0)).toBe(90);

    expect(page).toContain(
      "This practice exam is the same length: 90 multiple-choice questions in 90 minutes, or a half-length exam of 45 questions in 45 minutes at the same pace."
    );
    const { description } = await generateMetadata();
    expect(description).toMatch(/^Free full-length Security\+ SY0-801 practice exam: 90 questions in 90 minutes/);
  });

  it("keeps its own 45 questions as the timed exam while the bank is not there, and says that instead", async () => {
    const doc = await served();
    const page = text(doc.body);
    expect(page).toContain(
      "CertBench offers a free practice exam for Security+ SY0-801. It has 45 original questions and a time limit of 45 minutes, with at least one question on each of the 27 SY0-801 objectives."
    );
    expect(page).toContain("You can also answer the questions one at a time.");
    expect(page).not.toContain("full-length");
    expect(page).not.toContain("full length");
    expect(fact(doc, "Questions")).toBe("45");
    expect(fact(doc, "Time limit")).toBe("45 minutes");
    expect(text(doc.querySelector("h2"))).toBe("45 questions in 45 minutes");
    expect(page).toContain("This practice exam is half that length: 45 multiple-choice questions in 45 minutes");
    const { description } = await generateMetadata();
    expect(description).toMatch(/^Free 45-question Security\+ SY0-801 practice test/);
  });

  it("calls the exam a practice exam in its sentences, and a practice test only where the page is named", async () => {
    drawn.current = fullDraw();
    const doc = await served();
    // The title, the questions people search for, and the names of other pages keep "practice test".
    // The practice questions themselves (the lists) are not the page's own sentences.
    doc.querySelectorAll("h1, h3, a, ol").forEach((el) => el.remove());
    const sentences = text(doc.body);
    expect(sentences).not.toMatch(/practice test\b/i);
    expect(sentences).toContain("practice exam");
  });
});
