import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankQuestion, PathBank } from "../bank";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import type { PathStructure } from "@/core/path/types";

const bank = vi.hoisted(() => ({
  current: null as PathBank | null,
  /** Set to make the read of the bank fail, as it does when the database cannot be reached. */
  failure: null as Error | null,
}));
vi.mock("../bank", () => ({
  loadPathBank: async () => {
    if (bank.failure) throw bank.failure;
    return bank.current;
  },
}));

import { loadQuickRound } from "../quick-round";

const SLUG = "security-plus-sy0-701";

/** A bank shaped like the real one: ten questions for every objective. */
function fakeBank(): PathBank {
  const codes = Object.keys(OBJECTIVE_TITLES[SLUG]);
  const domainNumbers = [...new Set(codes.map((c) => `${c.split(".")[0]}.0`))];
  const structure: PathStructure = {
    certSlug: SLUG,
    examName: "Security+",
    examCode: "SY0-701",
    domains: domainNumbers.map((number) => ({
      number,
      title: `Domain ${number}`,
      weight: 20,
      objectives: codes
        .filter((c) => `${c.split(".")[0]}.0` === number)
        .map((code) => ({ code, title: OBJECTIVE_TITLES[SLUG][code] })),
    })),
  };
  const questions: BankQuestion[] = [];
  let n = 0;
  for (const d of structure.domains) {
    for (const o of d.objectives) {
      for (let i = 0; i < 10; i++) {
        const words = 15 + i * 8;
        questions.push({
          id: `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`,
          objective: o.code,
          domain: d.number,
          text: Array.from({ length: words }, () => "word").join(" "),
          options: ["Alpha", "Beta", "Gamma", "Delta"],
          answer: i % 4,
          explanation: "Why A is correct: The first sentence. The second sentence.",
          words,
          optionWords: 1,
        });
      }
    }
  }
  return { certId: "cert", structure, questions, byId: new Map(questions.map((q) => [q.id, q])) };
}

beforeEach(() => {
  bank.current = fakeBank();
  bank.failure = null;
});

describe("loadQuickRound", () => {
  it("builds the introductory questions for a page, the same on every build", async () => {
    const first = await loadQuickRound(SLUG, "warmup");
    const again = await loadQuickRound(SLUG, "warmup");
    expect(first?.cert).toBe(SLUG);
    expect(first?.examName).toBe("Security+");
    expect(first?.reps).toHaveLength(8);
    expect(first?.reps.map((r) => r.id)).toEqual(again?.reps.map((r) => r.id));
    expect(first?.structure.domains).toHaveLength(5);
  });

  it("builds an objective's step", async () => {
    const round = await loadQuickRound(SLUG, "1.2");
    expect(round?.reps.length).toBeGreaterThan(0);
    expect(round?.title).toBeTruthy();
  });

  it("leaves the page without a round in the cases where there is none to offer", async () => {
    // Not a study path exam; no such step; a step that is not a round of questions.
    expect(await loadQuickRound("not-an-exam", "warmup")).toBeNull();
    expect(await loadQuickRound(SLUG, "9.9")).toBeNull();
    expect(await loadQuickRound(SLUG, "checkpoint")).toBeNull();
    // The database does not have the exam.
    bank.current = null;
    expect(await loadQuickRound(SLUG, "warmup")).toBeNull();
  });

  it("fails when the bank could not be read, so a page being rebuilt keeps its last good copy", async () => {
    bank.failure = new Error("connection refused");
    await expect(loadQuickRound(SLUG, "warmup")).rejects.toThrow("connection refused");
    await expect(loadQuickRound(SLUG, "1.2")).rejects.toThrow("connection refused");
  });
});
