// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// A server render only: nothing here signs anyone in, counts anything or reaches an API.
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

import { NETWORK_PLUS_CERT, usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import PortQuizPage from "../port-numbers-quiz/page";
import AcronymsQuizPage from "../security-plus-acronyms-quiz/page";
import SubnetCalculatorPage from "../subnet-calculator/page";
import SubnettingPracticePage from "../subnetting-practice/page";

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The navy card at the foot of a tool page, which leads to the study path: its sentences and where its button goes. */
function card(page: React.ReactElement): { said: string; href: string | null } {
  const doc = new DOMParser().parseFromString(renderToString(page), "text/html");
  const sheet = doc.querySelector("section.cb-sheet");
  return { said: text(sheet?.querySelector("p")), href: sheet?.querySelector("a")?.getAttribute("href") ?? null };
}

/**
 * What a tool page says the study path covers. The Security+ and A+ steps
 * follow CompTIA's objectives. The Network+ steps follow CertBench's own
 * topics, so a Network+ page says "every topic", and a page for every exam
 * says what is true of them all.
 */
describe("the card that leads from a tool page to the study path", () => {
  it("says every topic on the two Network+ pages, because the Network+ steps are not CompTIA's objectives", () => {
    // When the Network+ steps follow CompTIA's objectives, these two pages say "objective" by themselves.
    expect(usesOfficialObjectiveNumbers(NETWORK_PLUS_CERT)).toBe(false);

    const calculator = card(<SubnetCalculatorPage />);
    expect(calculator.href).toBe("/path/network-plus-n10-009");
    expect(calculator.said).toBe(
      "The N10-009 exam has five domains. The Network+ study path covers every topic in short steps, up to a readiness checkpoint that shows where you stand."
    );

    const practice = card(<SubnettingPracticePage />);
    expect(practice.href).toBe("/path/network-plus-n10-009");
    expect(practice.said).toBe(
      "The N10-009 exam has five domains. The Network+ study path covers every topic in short sets of questions like these, up to a readiness checkpoint that shows where you stand."
    );
  });

  it("says the one sentence that is true of every exam on the port quiz, which leads to the list of exams", () => {
    const quiz = card(<PortQuizPage />);
    expect(quiz.href).toBe("/start");
    expect(quiz.said).toBe(
      "Most of the exam consists of scenarios. Choose your exam, and its study path works through the exam topic by topic, in short sets of questions like this one, up to a readiness checkpoint that shows where you stand."
    );
  });

  it("still says every objective on the Security+ page, where it is true", () => {
    const quiz = card(<AcronymsQuizPage />);
    expect(quiz.href).toBe("/path/security-plus-sy0-701");
    expect(quiz.said).toContain("The Security+ study path covers every objective in short sets of questions like this one");
  });
});
