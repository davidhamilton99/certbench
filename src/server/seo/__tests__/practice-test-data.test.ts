import { beforeEach, describe, expect, it, vi } from "vitest";

/** The exam's active questions in id order: q00 to q119. */
const QUESTIONS = Array.from({ length: 120 }, (_, i) => `q${String(i).padStart(2, "0")}`);

const db = vi.hoisted(() => ({
  /** The ids of the questions in the page's timed practice exam. */
  inExam: [] as string[],
  /** How many questions each read of the samples asked for. */
  asked: [] as number[],
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
      options: [{ text: "Right" }, { text: "Wrong" }],
      correct_index: 0,
      explanation: "Because.",
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
});
