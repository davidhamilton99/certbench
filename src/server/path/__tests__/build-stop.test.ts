import { describe, expect, it } from "vitest";
import { buildStop } from "../build-stop";
import type { BankQuestion, PathBank } from "../bank";
import { buildPlan, CHECKPOINT_SIZE, LEARN_NEW_REPS, PRACTICE_SIZE } from "@/core/path/plan";
import { parseRepId, recallRepId } from "@/core/path/rep-id";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import type { PathStructure, Rep } from "@/core/path/types";

/** A bank shaped like the real one: every objective has questions of many lengths. */
function fakeBank(slug: string, weights: number[]): PathBank {
  const codes = Object.keys(OBJECTIVE_TITLES[slug]);
  const domainNumbers = [...new Set(codes.map((c) => `${c.split(".")[0]}.0`))];
  const structure: PathStructure = {
    certSlug: slug,
    examName: "Exam",
    examCode: "X",
    domains: domainNumbers.map((number, i) => ({
      number,
      title: `Domain ${number}`,
      weight: weights[i] ?? 20,
      objectives: codes
        .filter((c) => `${c.split(".")[0]}.0` === number)
        .map((code) => ({ code, title: OBJECTIVE_TITLES[slug][code] })),
    })),
  };
  const questions: BankQuestion[] = [];
  let n = 0;
  for (const d of structure.domains) {
    for (const o of d.objectives) {
      for (let i = 0; i < 10; i++) {
        const words = 15 + i * 8;
        const id = `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;
        questions.push({
          id,
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

const secPlus = fakeBank("security-plus-sy0-701", [12, 22, 18, 28, 20]);
const secPlan = buildPlan(secPlus.structure);
const netPlus = fakeBank("network-plus-n10-009", [23, 20, 19, 14, 24]);
const netPlan = buildPlan(netPlus.structure);

const build = (bank: PathBank, plan: ReturnType<typeof buildPlan>, index: number, extra?: { seen?: string[]; missed?: string[]; seed?: number }) =>
  buildStop({ bank, plan, index, seen: extra?.seen ?? [], missed: extra?.missed ?? [], seed: extra?.seed ?? 42 })!;

function expectValid(reps: Rep[]) {
  expect(new Set(reps.map((r) => r.id)).size).toBe(reps.length);
  for (const r of reps) {
    expect(parseRepId(r.id), r.id).not.toBeNull();
    expect(r.id.length).toBeLessThanOrEqual(64);
    if (r.type === "choice") {
      expect(r.answer).toBeGreaterThanOrEqual(0);
      expect(r.answer).toBeLessThan(r.options.length);
    } else {
      expect(r.accept.length).toBeGreaterThan(0);
    }
  }
}

describe("buildStop — Security+", () => {
  it("opens with the hand-written warm-up, ending on its exam-style rep", () => {
    const { stop, reps } = build(secPlus, secPlan, 0);
    expect(stop.kind).toBe("warmup");
    expect(reps).toHaveLength(8);
    expect(reps.every((r) => parseRepId(r.id)?.source === "a")).toBe(true);
    expect(reps.at(-1)?.tier).toBe("exam");
    expectValid(reps);
  });

  it("builds a learn stop from its seven hand-written reps plus the shortest exam question", () => {
    const { stop, reps } = build(secPlus, secPlan, 1);
    expect(stop.id).toBe("1.1");
    expect(reps).toHaveLength(LEARN_NEW_REPS + 1);
    expect(reps.slice(0, LEARN_NEW_REPS).every((r) => r.id.startsWith("a|1.1|"))).toBe(true);
    const closer = reps.at(-1)!;
    expect(closer.id.startsWith("q|1.1|")).toBe(true);
    expect(closer.tier).toBe("exam");
    expect(closer.type === "choice" && closer.lettered).toBe(true);
    expect(closer.takeaway).toBe("The first sentence.");
    expectValid(reps);
  });

  it("shuffles bank options, keeping a map back to the stored order", () => {
    const { reps } = build(secPlus, secPlan, secPlan.freeThrough);
    let moved = 0;
    for (const r of reps) {
      if (r.type !== "choice") continue;
      const q = secPlus.byId.get(r.id.split("|")[2])!;
      expect(r.order).toHaveLength(q.options.length);
      r.options.forEach((o, i) => expect(o).toBe(q.options[r.order![i]]));
      expect(r.order![r.answer]).toBe(q.answer);
      if (r.order!.some((stored, i) => stored !== i)) moved++;
    }
    expect(moved).toBeGreaterThan(0);
  });

  it("keeps the stored order when the explanation names options by letter, anywhere in it", () => {
    const q = secPlus.questions.find((x) => x.objective === "1.1")!;
    const explanations = [
      "Why B is correct: It is. Option A describes something else.",
      // In the first sentence, which becomes the takeaway.
      "Why B is correct: Unlike option A, it does. More detail follows.",
      // The wording two live Security+ explanations use.
      "Why B is correct: It is. The tradeoffs are complexity in administration and monitoring, making A and D incorrect.",
      "Why B is correct: It is. NEXT and FEXT (options A and C) are internal.",
    ];
    for (const explanation of explanations) {
      const lettered = { ...q, explanation };
      const bank = { ...secPlus, questions: [lettered], byId: new Map([[q.id, lettered]]) };
      const closer = build(bank, secPlan, 1).reps.at(-1)!;
      expect(closer.type === "choice" && closer.order, explanation).toEqual([0, 1, 2, 3]);
    }
  });

  it("still shuffles when letters are only names, like USB-C or an A record", () => {
    const q = secPlus.questions.find((x) => x.objective === "1.1")!;
    const named = { ...q, explanation: "Why B is correct: A AAAA record maps a name to IPv6. USB-C is reversible." };
    const bank = { ...secPlus, questions: [named], byId: new Map([[q.id, named]]) };
    const orders = [1, 2, 3, 4, 5, 6].map((seed) => {
      const closer = build(bank, secPlan, 1, { seed }).reps.at(-1)!;
      return closer.type === "choice" ? closer.order!.join() : "";
    });
    expect(orders.some((o) => o !== "0,1,2,3")).toBe(true);
  });

  it("brings earlier misses back first, from any source", () => {
    const missedBank = secPlus.questions.find((q) => q.objective === "2.4")!;
    const missed = [`a|4.5|w1`, `q|2.4|${missedBank.id}`, "a|1.1|1.1c"];
    const { reps } = build(secPlus, secPlan, 2, { missed });
    expect(reps.slice(0, 2).map((r) => r.id)).toEqual(["a|4.5|w1", `q|2.4|${missedBank.id}`]);
    expectValid(reps);
  });

  it("skips misses it can no longer resolve", () => {
    const { reps } = build(secPlus, secPlan, 2, { missed: ["a|9.9|gone", "q|1.1|not-a-question"] });
    expect(reps.every((r) => r.objective === "1.2")).toBe(true);
  });

  it("weights the checkpoint across every domain with exam-style questions", () => {
    const { stop, reps } = build(secPlus, secPlan, secPlan.freeThrough);
    expect(stop.kind).toBe("checkpoint");
    expect(reps).toHaveLength(CHECKPOINT_SIZE);
    const domains = new Set(reps.map((r) => r.objective.split(".")[0]));
    expect(domains.size).toBe(5);
    expect(reps.every((r) => r.tier === "exam")).toBe(true);
    expectValid(reps);
  });

  it("prefers checkpoint questions that haven't been seen", () => {
    const seen = secPlus.questions.filter((q) => q.domain === "4.0").slice(0, 80).map((q) => `q|${q.objective}|${q.id}`);
    const { reps } = build(secPlus, secPlan, secPlan.freeThrough, { seen });
    const seenSet = new Set(seen);
    expect(reps.filter((r) => seenSet.has(r.id))).toHaveLength(0);
  });

  it("fills a domain practice stop from that domain, spread across its objectives", () => {
    const index = secPlan.stops.findIndex((s) => s.id === "d2");
    const { reps } = build(secPlus, secPlan, index);
    expect(reps).toHaveLength(PRACTICE_SIZE);
    expect(reps.every((r) => r.objective.startsWith("2."))).toBe(true);
    expect(new Set(reps.map((r) => r.objective)).size).toBe(5);
  });

  it("keeps going past the last stop with review rounds", () => {
    const missed = secPlus.questions.slice(0, 3).map((q) => `q|${q.objective}|${q.id}`);
    const { stop, reps } = build(secPlus, secPlan, secPlan.stops.length, { missed });
    expect(stop.kind).toBe("review");
    expect(reps).toHaveLength(PRACTICE_SIZE);
    expect(reps.slice(0, 3).map((r) => r.id)).toEqual(missed);
    expectValid(reps);
  });

  it("builds the same stop from the same seed, and a different shuffle from another", () => {
    const a = build(secPlus, secPlan, 1, { seed: 7 }).reps;
    const b = build(secPlus, secPlan, 1, { seed: 7 }).reps;
    expect(a).toEqual(b);
    const options = (reps: Rep[]) => reps.map((r) => (r.type === "choice" ? r.options.join() : r.prompt)).join("|");
    const variants = new Set([1, 2, 3, 4, 5].map((seed) => options(build(secPlus, secPlan, 1, { seed }).reps)));
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("buildStop — Network+", () => {
  it("opens with recall facts and the bank's snappiest questions", () => {
    const { reps } = build(netPlus, netPlan, 0);
    const sources = reps.map((r) => parseRepId(r.id)?.source);
    expect(sources.filter((s) => s === "r").length).toBe(5);
    expect(sources.filter((s) => s === "q").length).toBeGreaterThanOrEqual(3);
    expect(reps.at(-1)?.tier).toBe("exam");
    expectValid(reps);
  });

  it("mixes recall facts into the objective that has a reference table", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.5");
    const { reps } = build(netPlus, netPlan, index);
    const recall = reps.filter((r) => r.id.startsWith("r|1.5|"));
    expect(recall.length).toBeGreaterThan(0);
    expect(reps).toHaveLength(LEARN_NEW_REPS + 1);
    expectValid(reps);
  });

  it("resolves a missed recall fact back into a rep", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.5");
    const first = build(netPlus, netPlan, index).reps.find((r) => r.id.startsWith("r|"))!;
    const later = netPlan.stops.findIndex((s) => s.id === "1.6");
    const { reps } = build(netPlus, netPlan, later, { missed: [first.id] });
    expect(reps[0].id).toBe(first.id);
  });

  it("reports a missed recall fact that's been taken out of its deck, but not a missing bank question", () => {
    // T568B is a pin-out standard: it has no "max speed", so the cable deck no longer asks.
    const withdrawn = recallRepId("1.3", "net-cables", "T568B wiring");
    const absentQuestion = "q|1.1|00000000-0000-4000-8000-999999999999";
    const later = netPlan.stops.findIndex((s) => s.id === "1.6");
    const { reps, retired } = build(netPlus, netPlan, later, { missed: [withdrawn, absentQuestion] });
    expect(retired).toEqual([withdrawn]);
    expect(reps.some((r) => r.id === withdrawn || r.id === absentQuestion)).toBe(false);
    expect(build(netPlus, netPlan, later).retired).toEqual([]);
  });

  it("never asks a cable's max speed when it has none", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.3");
    for (let seed = 1; seed <= 40; seed++) {
      for (const r of build(netPlus, netPlan, index, { seed }).reps) {
        if (r.type !== "choice" || !r.id.startsWith("r|1.3|net-cables|")) continue;
        expect(r.prompt).not.toMatch(/^T568/);
        for (const option of r.options) expect(option, r.prompt).toMatch(/bps/);
      }
    }
  });

  it("names the number in a subnet fact's takeaway", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.4");
    let checked = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const r of build(netPlus, netPlan, index, { seed }).reps) {
        if (!r.id.startsWith("r|1.4|auto-subnetting-chart|")) continue;
        expect(r.takeaway).toMatch(/ · [\d,]+ usable hosts$/);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("makes the subnetting stop hands-on: one fresh problem per skill", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.4");
    const { reps } = build(netPlus, netPlan, index);
    const subnet = reps.filter((r) => r.id.startsWith("r|1.4|subnet|"));
    expect(subnet.map((r) => r.id.split("|")[3]).sort()).toEqual(
      ["cidr-mask", "host-math", "network-id", "same-subnet"].sort()
    );
    for (const r of subnet) {
      expect(r.label).toBe("Hands-on");
      if (r.type === "typed") {
        expect(r.answerKind).toBeDefined();
        expect(r.accept).toHaveLength(1);
      } else {
        expect(r.options).toEqual(["Yes", "No"]);
      }
    }
    expect(reps).toHaveLength(LEARN_NEW_REPS + 1);
    expectValid(reps);
  });

  it("still closes on an exam question when every question for the objective is short", () => {
    const shortBank: PathBank = {
      ...netPlus,
      questions: netPlus.questions.map((q) => (q.objective === "1.4" ? { ...q, words: 12, optionWords: 2 } : q)),
    };
    shortBank.byId = new Map(shortBank.questions.map((q) => [q.id, q]));
    const index = netPlan.stops.findIndex((s) => s.id === "1.4");
    const { reps } = build(shortBank, netPlan, index);
    expect(reps).toHaveLength(LEARN_NEW_REPS + 1);
    const closer = reps.at(-1)!;
    expect(closer.id.startsWith("q|1.4|")).toBe(true);
    expect(closer.tier).toBe("exam");
  });

  it("writes acronyms in recall cues in capitals", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "1.4");
    const cues = build(netPlus, netPlan, index).reps.map((r) => r.cue ?? "");
    expect(cues.some((c) => /cidr/.test(c))).toBe(false);
  });

  it("brings a missed subnetting skill back as a new problem of the same kind", () => {
    const later = netPlan.stops.findIndex((s) => s.id === "1.6");
    const { reps } = build(netPlus, netPlan, later, { missed: ["r|1.4|subnet|host-math"] });
    expect(reps[0].id).toBe("r|1.4|subnet|host-math");
    // Host math asks either direction: hosts in a prefix, or prefix for hosts.
    expect(reps[0].type === "typed" && ["count", "cidr"].includes(reps[0].answerKind ?? "")).toBe(true);
  });

  it("uses the bank's quick questions for an objective with no table", () => {
    const index = netPlan.stops.findIndex((s) => s.id === "3.2");
    const { reps } = build(netPlus, netPlan, index);
    expect(reps).toHaveLength(LEARN_NEW_REPS + 1);
    expect(reps.every((r) => r.id.startsWith("q|3.2|"))).toBe(true);
    // Shortest questions first, the longest saved for the closing rep.
    expect(reps[0].tier).toBe("quick");
  });
});
