import { describe, expect, it } from "vitest";
import { examReps, examStructure, shuffled } from "../practice-exam";

const question = {
  id: "t-1",
  objective: "4.1",
  questionText: "Which control blocks traffic when it fails?",
  options: ["Fail-open", "Fail-closed", "Failover", "Fail forward"],
  correctIndex: 1,
  explanation: "Fail-closed blocks traffic when the control fails. Fail-open lets it pass uninspected.",
};

describe("examReps", () => {
  it("turns a question into a lettered exam-style rep, the explanation's first line as its takeaway", () => {
    const [rep] = examReps([question]);
    expect(rep).toEqual({
      type: "choice",
      id: "t-1",
      label: "Exam style",
      tier: "exam",
      objective: "4.1",
      prompt: question.questionText,
      options: question.options,
      answer: 1,
      takeaway: "Fail-closed blocks traffic when the control fails.",
      explanation: "Fail-open lets it pass uninspected.",
      lettered: true,
    });
  });

  it("leaves out the fold when the explanation is one sentence", () => {
    const [rep] = examReps([{ ...question, explanation: "Fail-closed blocks traffic when the control fails." }]);
    expect(rep.takeaway).toBe("Fail-closed blocks traffic when the control fails.");
    expect(rep).not.toHaveProperty("explanation");
  });
});

describe("examStructure", () => {
  it("carries the exam's domains, weights and objectives", () => {
    const structure = examStructure({
      slug: "security-plus-sy0-801",
      examName: "Security+ SY0-801",
      examCode: "SY0-801",
      domains: [{ number: "1.0", title: "General Security Concepts", weight: 16, objectives: [{ code: "1.1", label: "Concepts" }] }],
    });
    expect(structure).toEqual({
      certSlug: "security-plus-sy0-801",
      examName: "Security+ SY0-801",
      examCode: "SY0-801",
      domains: [
        { number: "1.0", title: "General Security Concepts", weight: 16, objectives: [{ code: "1.1", title: "Concepts" }] },
      ],
    });
  });
});

describe("shuffled", () => {
  it("keeps every item and leaves the input alone", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const out = shuffled(items);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("follows the random source it's given", () => {
    // Always picking the last candidate leaves the order as it was.
    expect(shuffled(["a", "b", "c"], () => 0.999)).toEqual(["a", "b", "c"]);
    // Always picking the first rotates the list.
    expect(shuffled(["a", "b", "c"], () => 0)).toEqual(["b", "c", "a"]);
  });
});
