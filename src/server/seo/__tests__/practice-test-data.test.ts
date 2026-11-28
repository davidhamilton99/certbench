import { beforeEach, describe, expect, it, vi } from "vitest";
import { seededRng, seedFrom, shuffle } from "@/core/path/compose";

/** The exam's active questions in id order: q00 to q119. */
const QUESTIONS = Array.from({ length: 120 }, (_, i) => `q${String(i).padStart(2, "0")}`);

/** Every question's answers as the bank stores them: the correct one second, where the bank has it most often. */
const STORED = ["Telnet", "SSH", "FTP", "HTTP"];
const STORED_ORDER = [0, 1, 2, 3];

/** How the page orders the answers of a question whose explanation names no letter. */
const shuffledOrder = (id: string) => shuffle(STORED_ORDER, seededRng(seedFrom(id)));

const db = vi.hoisted(() => ({
  /** The ids of the questions in the page's timed practice exam. */
  inExam: [] as string[],
  /** How many questions each read of the samples asked for. */
  asked: [] as number[],
  /** The ids of the questions whose explanation names an answer by its letter. */
  lettered: [] as string[],
}));

vi.mock("@/server/supabase/anon", () => ({ createAnonClient: () => ({}) }));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => ({
    id: `id-${slug}`,
    slug,
    name: "CompTIA Security+",
    examCode: "SY0-701",
  }),
  listDomains: async () => [],
}));
vi.mock("@/server/data/questions", () => ({
  countActiveQuestions: async () => QUESTIONS.length,
  // As the real read does: the first questions in id order.
  listSampleQuestions: async (_db: unknown, _certId: string, count: number) => {
    db.asked.push(count);
    return QUESTIONS.slice(0, count).map((id) => ({
      id,
      question_text: `Question ${id}?`,
      options: STORED.map((text) => ({ text })),
      correct_index: 1,
      explanation: db.lettered.includes(id) ? "Option B is the only one of these that encrypts the session." : "Because.",
    }));
  },
}));
vi.mock("@/server/path/public-test", () => ({
  loadPublicTest: async (slug: string) =>
    db.inExam.length === 0
      ? null
      : { testId: slug, size: "full", reps: db.inExam.map((id) => ({ id: `q|1.1|${id}` })) },
}));

import { loadPracticeTestData } from "../practice-test-data";

beforeEach(() => {
  db.inExam = [];
  db.asked = [];
  db.lettered = [];
});

describe("loadPracticeTestData", () => {
  // The page also offers the exam's timed practice exam, which never shows
  // the answers of an exam that is being taken. The samples are listed with
  // their answers, so none of them may be one of the exam's questions.
  it("lists no sample question that is one of the page's practice exam questions", async () => {
    db.inExam = ["q00", "q03", "q04", "q09", ...QUESTIONS.slice(20, 106)];
    const data = await loadPracticeTestData(["security-plus-sy0-701"]);
    const listed = data.sampleGroups[0].questions.map((q) => q.questionText);
    expect(listed).toHaveLength(10);
    expect(listed).toEqual(["q01", "q02", "q05", "q06", "q07", "q08", "q10", "q11", "q12", "q13"].map((id) => `Question ${id}?`));
    // The window holds the whole exam and still leaves enough.
    expect(db.asked).toEqual([100]);
  });

  it("lists the first questions as before where the page has no practice exam", async () => {
    const data = await loadPracticeTestData(["security-plus-sy0-701"]);
    expect(data.sampleGroups[0].questions.map((q) => q.questionText)).toEqual(
      QUESTIONS.slice(0, 10).map((id) => `Question ${id}?`)
    );
  });

  it("shares the ten samples between two exams on one page", async () => {
    const data = await loadPracticeTestData(["a-plus-core1-220-1201", "a-plus-core2-220-1202"]);
    expect(data.sampleGroups.map((g) => g.questions.length)).toEqual([5, 5]);
  });

  // The defect: the samples were listed in their stored order, which has the
  // answer at B in half of the bank, so a visitor who always chose B was right
  // half the time.
  it("lists each sample's answers shuffled, the same way every time, with the correct answer still marked", async () => {
    const data = await loadPracticeTestData(["security-plus-sy0-701"]);
    const samples = data.sampleGroups[0].questions;
    expect(samples.map((q) => q.options)).toEqual(
      QUESTIONS.slice(0, 10).map((id) => shuffledOrder(id).map((k) => STORED[k]))
    );
    for (const q of samples) expect(q.options[q.correctIndex]).toBe("SSH");
    // As stored, every one of these answers is at B.
    expect(new Set(samples.map((q) => q.correctIndex)).size).toBeGreaterThan(1);
    const again = await loadPracticeTestData(["security-plus-sy0-701"]);
    expect(again.sampleGroups[0].questions).toEqual(samples);
  });

  // The page prints the explanation under the lettered answers, so the letter
  // in it must name the answer shown under that letter.
  it("keeps the stored order of a sample whose explanation names an answer by its letter", async () => {
    // The test's own ground: shuffled, this question's answers would move.
    expect(shuffledOrder("q03")).not.toEqual(STORED_ORDER);
    db.lettered = ["q03"];
    const data = await loadPracticeTestData(["security-plus-sy0-701"]);
    const sample = data.sampleGroups[0].questions[3];
    expect(sample.questionText).toBe("Question q03?");
    expect(sample.options).toEqual(STORED);
    expect(sample.correctIndex).toBe(1);
  });
});
