import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CertQuestion } from "@/core/question-selection/types";
import { seededRng, seedFrom, shuffle } from "@/core/path/compose";

const data = vi.hoisted(() => ({
  /** The objective's questions, as the bank's reader returns them. */
  questions: [] as unknown[],
}));

vi.mock("@/server/supabase/anon", () => ({ createAnonClient: () => ({}) }));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => ({
    id: "cert-1",
    slug,
    name: "CompTIA Security+",
    examCode: "SY0-701",
  }),
  listActiveCertifications: async () => [],
  listDomains: async () => [
    { id: "d1", domainNumber: "1.0", title: "General Security Concepts", examWeight: 12, sortOrder: 1 },
  ],
  listSubObjectives: async () => [
    { id: "s12", code: "1.2", title: "Summarize fundamental security concepts", domain_id: "d1" },
  ],
}));
vi.mock("@/server/data/questions", () => ({
  // Enough questions for the objective to have a page.
  countQuestionsBySubObjective: async () => new Map([["s12", 9]]),
  listQuestionsBySubObjective: async () => data.questions,
}));

import { loadObjectivePage } from "../objective-data";

const CERT = "security-plus-sy0-701";
/** Every question's answers as the bank stores them: the correct one second, where the bank has it most often. */
const STORED = ["Telnet", "SSH", "FTP", "HTTP"];
const STORED_ORDER = [0, 1, 2, 3];
/** The page's five samples, in id order. */
const IDS = ["q-a", "q-b", "q-c", "q-d", "q-e"];

/** How the page orders the answers of a question whose explanation names no letter. */
const shuffledOrder = (id: string) => shuffle(STORED_ORDER, seededRng(seedFrom(id)));

/** An id whose shuffle really moves the answers, so that "kept in the stored order" can be told from "shuffled". */
const MOVED = IDS.find((id) => shuffledOrder(id).join() !== STORED_ORDER.join()) as string;

function question(id: string, explanation = "SSH encrypts the whole session."): CertQuestion {
  return {
    id,
    certification_id: "cert-1",
    domain_id: "d1",
    sub_objective_id: "s12",
    question_text: `Which protocol encrypts a remote shell (${id})?`,
    options: STORED.map((text, i) => ({ text, is_correct: i === 1 })),
    correct_index: 1,
    explanation,
    difficulty: 1,
  };
}

/** The samples of the objective's page, built from the questions given. */
async function samplesOf(questions: CertQuestion[]) {
  data.questions = questions;
  const page = await loadObjectivePage(CERT, "1-2");
  if (!page) throw new Error("the objective has no page");
  return page.samples;
}

beforeEach(() => {
  data.questions = [];
});

describe("an objective page's sample questions", () => {
  it("the test's own ground: this question's answers move when they are shuffled", () => {
    expect(MOVED).toBeTruthy();
    expect(shuffledOrder(MOVED)).not.toEqual(STORED_ORDER);
  });

  // The defect: the samples were listed in their stored order, which has the
  // answer at B in half of the bank, so a visitor who always chose B was right
  // half the time.
  it("have their answers shuffled, the same way every time, with the correct answer still marked", async () => {
    const samples = await samplesOf(IDS.map((id) => question(id)));
    expect(samples.map((q) => q.options)).toEqual(IDS.map((id) => shuffledOrder(id).map((k) => STORED[k])));
    for (const q of samples) expect(q.options[q.correctIndex]).toBe("SSH");
    // As stored, every one of these answers is at B.
    expect(new Set(samples.map((q) => q.correctIndex)).size).toBeGreaterThan(1);
    expect(await samplesOf(IDS.map((id) => question(id)))).toEqual(samples);
  });

  // The page prints the explanation under the lettered answers, so the letter
  // in it must name the answer shown under that letter.
  it("keep the stored order when the explanation names an answer by its letter", async () => {
    const [sample] = await samplesOf([
      question(MOVED, "SSH encrypts the session. Option A (Telnet) sends it in clear text."),
    ]);
    expect(sample.options).toEqual(STORED);
    expect(sample.correctIndex).toBe(1);
    expect(sample.options["ABCD".indexOf("A")]).toBe("Telnet");
  });
});
