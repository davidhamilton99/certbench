import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CertQuestion } from "@/core/question-selection/types";
import { seededRng, seedFrom, shuffle } from "@/core/path/compose";

const data = vi.hoisted(() => ({
  /** The questions marked for the readiness check, as the bank's reader returns them. */
  pool: [] as unknown[],
}));

// The public pages' client: the check asks it for one thing itself, a count of objectives.
vi.mock("@/server/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        in: () => builder,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: 28, error: null }).then(resolve),
      };
      return builder;
    },
  }),
}));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => ({
    id: "cert-1",
    slug,
    name: "CompTIA Security+",
    examCode: "SY0-701",
  }),
  listActiveCertifications: async () => [],
  // As the database holds them: with CompTIA's capitals.
  listDomains: async () => [
    { id: "d1", domainNumber: "1.0", title: "General Security Concepts", examWeight: 50, sortOrder: 1 },
    { id: "d2", domainNumber: "2.0", title: "Security Operations", examWeight: 50, sortOrder: 2 },
  ],
}));
vi.mock("@/server/data/questions", () => ({
  listDiagnosticQuestions: async () => data.pool,
}));

import { loadReadinessCheck } from "../readiness-check-data";

const CERT = "security-plus-sy0-701";
const STORED = ["Telnet", "FTP", "SSH", "HTTP"];
const STORED_ORDER = [0, 1, 2, 3];

/** How the page orders the answers of a question whose explanation names no letter. */
const shuffledOrder = (id: string) => shuffle(STORED_ORDER, seededRng(seedFrom(id)));

/** An id whose shuffle really moves the answers, so that "kept in the stored order" can be told from "shuffled". */
const MOVED = ["q-a", "q-b", "q-c", "q-d", "q-e", "q-f"].find((id) => shuffledOrder(id).join() !== STORED_ORDER.join()) as string;

function question(id: string, domain: string, explanation: string): CertQuestion {
  return {
    id,
    certification_id: "cert-1",
    domain_id: domain,
    sub_objective_id: null,
    question_text: "Which protocol encrypts a remote shell?",
    options: STORED.map((text, i) => ({ text, is_correct: i === 2 })),
    correct_index: 2,
    explanation,
    difficulty: 1,
  };
}

/** The check built from one question under test and enough plain ones to fill both domains. */
async function checkWith(explanation: string) {
  data.pool = [
    question(MOVED, "d1", explanation),
    ...Array.from({ length: 4 }, (_, i) => question(`z-fill-1-${i}`, "d1", "SSH encrypts the session.")),
    ...Array.from({ length: 5 }, (_, i) => question(`z-fill-2-${i}`, "d2", "SSH encrypts the session.")),
  ];
  const check = await loadReadinessCheck(CERT);
  const shown = check?.questions.find((q) => q.explanation === explanation);
  if (!shown) throw new Error("the question under test is not in the check");
  return { check, shown };
}

beforeEach(() => {
  data.pool = [];
});

describe("the readiness check's questions", () => {
  it("the test's own ground: this question's answers move when they are shuffled", () => {
    expect(MOVED).toBeTruthy();
    expect(shuffledOrder(MOVED)).not.toEqual(STORED_ORDER);
  });

  it("are ten, drawn from each domain by its weight", async () => {
    const { check } = await checkWith("SSH encrypts the whole session.");
    expect(check?.questions).toHaveLength(10);
    expect(check?.questions.filter((q) => q.domainTitle === "General security concepts")).toHaveLength(5);
    expect(check?.objectiveCount).toBe(28);
  });

  // The practice-test pages name the domains in sentence case, so the check names them the same way.
  it("name each domain in sentence case, as the practice-test pages do", async () => {
    const { check } = await checkWith("SSH encrypts the whole session.");
    expect([...new Set(check?.questions.map((q) => q.domainTitle))]).toEqual(["General security concepts", "Security operations"]);
  });

  it("have their answers shuffled, the same way every time, with the correct answer still marked", async () => {
    const { shown } = await checkWith("SSH encrypts the whole session.");
    expect(shown.options).toEqual(shuffledOrder(MOVED).map((k) => STORED[k]));
    expect(shown.options).not.toEqual(STORED);
    expect(shown.options[shown.correctIndex]).toBe("SSH");
    const again = await checkWith("SSH encrypts the whole session.");
    expect(again.shown.options).toEqual(shown.options);
  });

  // The defect: only the part after the first sentence was read for a letter.
  // The first sentence is printed too, as the reason, so "Option C" in it
  // named whichever answer the shuffle had put third.
  it("keep the stored order when the first sentence of the explanation names an answer by its letter", async () => {
    const { shown } = await checkWith("Option C is the only protocol here that encrypts the session. Telnet sends it in clear text.");
    expect(shown.options).toEqual(STORED);
    expect(shown.correctIndex).toBe(2);
    // The letter in the text names the answer shown under that letter.
    expect(shown.options["ABCD".indexOf("C")]).toBe("SSH");
  });

  it("keep the stored order when a later sentence names an answer by its letter", async () => {
    const { shown } = await checkWith("SSH encrypts the session. Option A (Telnet) sends it in clear text.");
    expect(shown.options).toEqual(STORED);
    expect(shown.correctIndex).toBe(2);
  });

  it("are shuffled when the only letter was in a lead that is not shown", async () => {
    // The page drops the lead and prints the rest, which names no letter.
    const { shown } = await checkWith("Why C is correct: SSH encrypts the whole session. Telnet does not.");
    expect(shown.options).toEqual(shuffledOrder(MOVED).map((k) => STORED[k]));
    expect(shown.options[shown.correctIndex]).toBe("SSH");
  });
});
