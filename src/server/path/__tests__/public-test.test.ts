import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankQuestion, PathBank } from "../bank";

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

import { loadPublicTest } from "../public-test";

const DOMAINS = [
  { number: "1.0", title: "Networking concepts", weight: 60, objectives: [{ code: "1.1", title: "OSI" }] },
  { number: "2.0", title: "Network operations", weight: 40, objectives: [{ code: "2.1", title: "Monitoring" }] },
];

function question(i: number, domain: string): BankQuestion {
  return {
    id: `q${i}`,
    objective: domain === "1.0" ? "1.1" : "2.1",
    domain,
    text: `Question ${i}?`,
    options: ["Right", "Wrong one", "Wrong two", "Wrong three"],
    answer: 0,
    explanation: "Because. More detail here.",
    words: 2,
    optionWords: 2,
  };
}

function withQuestions(n: number): PathBank {
  const questions = Array.from({ length: n }, (_, i) => question(i, i % 2 === 0 ? "1.0" : "2.0"));
  return {
    certId: "net",
    structure: { certSlug: "network-plus-n10-009", examName: "Network+", examCode: "N10-009", domains: DOMAINS },
    questions,
    byId: new Map(questions.map((q) => [q.id, q])),
  };
}

beforeEach(() => {
  bank.current = null;
  bank.failure = null;
});

describe("loadPublicTest", () => {
  it("draws a full-length 90-question exam in the exam's weights, the same on every build", async () => {
    bank.current = withQuestions(200);
    const first = await loadPublicTest("network-plus-n10-009");
    const again = await loadPublicTest("network-plus-n10-009");
    expect(first?.size).toBe("full");
    expect(first?.reps).toHaveLength(90);
    expect(first?.reps.map((r) => r.id)).toEqual(again?.reps.map((r) => r.id));
    expect(first?.reps.filter((r) => r.objective === "1.1")).toHaveLength(54);
    expect(first?.structure).toEqual({ certSlug: "network-plus-n10-009", examName: "Network+", examCode: "N10-009", domains: DOMAINS });
    expect(first?.reps.every((r) => r.tier === "exam")).toBe(true);
  });

  it("draws a half-length test from a bank too thin for a full one", async () => {
    bank.current = withQuestions(60);
    const test = await loadPublicTest("network-plus-n10-009");
    expect(test?.size).toBe("half");
    expect(test?.reps).toHaveLength(45);
  });

  it("leaves the page without a test when the bank cannot fill one, or is not there", async () => {
    bank.current = withQuestions(30);
    expect(await loadPublicTest("network-plus-n10-009")).toBeNull();
    bank.current = null;
    expect(await loadPublicTest("network-plus-n10-009")).toBeNull();
    expect(await loadPublicTest("not-an-exam")).toBeNull();
  });

  it("fails when the bank could not be read, so a page being rebuilt keeps its last good copy", async () => {
    // Null would rebuild the page without its practice exam and keep it that
    // way for a day. A failure leaves the page as it was and is tried again.
    bank.failure = new Error("connection refused");
    await expect(loadPublicTest("network-plus-n10-009")).rejects.toThrow("connection refused");
    // An exam that is not on a study path is still simply absent.
    expect(await loadPublicTest("not-an-exam")).toBeNull();
  });
});
