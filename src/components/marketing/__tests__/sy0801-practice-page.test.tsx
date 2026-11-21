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

async function served(): Promise<string> {
  const doc = new DOMParser().parseFromString(renderToString(await Page()), "text/html");
  return (doc.querySelector("main")?.textContent ?? "").replace(/\s+/g, " ");
}

beforeEach(() => {
  drawn.current = null;
});

describe("the SY0-801 practice test page", () => {
  it("serves the full-length exam from the bank, and says so", async () => {
    drawn.current = fullDraw();
    const text = await served();
    expect(text).toContain("A full-length exam: 90 questions in 90 minutes, the real exam's limit, across all of SY0-801's 27 objectives.");
    expect(text).toContain("take a half exam of 45");
    expect(text).toContain("work through 45 more questions one at a time");
    expect(text).toContain("The 90 questions are split across the five domains");
    expect(text).toContain("This practice exam is the same length: 90 multiple-choice questions in 90 minutes, or a half exam of 45 in 45 minutes");
    const { description } = await generateMetadata();
    expect(description).toMatch(/^Free full-length Security\+ SY0-801 practice exam: 90 questions in 90 minutes/);
  });

  it("keeps its own 45 questions as the timed test while the bank isn't there, and says that instead", async () => {
    const text = await served();
    expect(text).toContain("45 original questions in 45 minutes, with at least one on each of SY0-801's 27 objectives.");
    expect(text).not.toContain("full-length");
    expect(text).toContain("This practice test is half that: 45 multiple-choice questions in 45 minutes");
    const { description } = await generateMetadata();
    expect(description).toMatch(/^Free 45-question Security\+ SY0-801 practice test/);
  });
});
