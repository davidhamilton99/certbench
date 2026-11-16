import { describe, expect, it } from "vitest";
import { PATH_CONTENT } from "@/data/path";
import { SY0_701_DROPPED, SY0_701_REWORDED, SY0_801_PATH_CONTENT } from "@/data/path/security-plus-sy0-801";
import { SY0_801_MAP } from "@/data/sy0-801";
import copiesJson from "@/data/sy0-801/copies.json";
import { authoredRepId, bankRepId } from "../rep-id";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "../types";
import { carryProgress, type VersionMapping } from "../version-carry";

const rec = (a: number, c: number, t: number) => ({ a, c, s: c, t });
const run = (at: number) => ({ n: 1, c: 7, t: 8, at });

const mapping: VersionMapping = {
  questions: { "q-old": ["q-new", "4.1"], "q-other": ["q-copy", "2.5"] },
  reps: { "1.2e": "4.1", "1.1a": "1.1" },
  replacedLabs: { "incident-response-steps": "incident-response-process" },
};

describe("carryProgress", () => {
  const from: PathProgress = {
    ...EMPTY_PATH_PROGRESS,
    items: {
      [bankRepId("2.5", "q-old")]: rec(2, 1, 100),
      [bankRepId("2.4", "q-other")]: rec(1, 0, 200),
      [bankRepId("1.4", "q-retired")]: rec(1, 1, 300),
      [authoredRepId("1.2", "1.2e")]: rec(1, 1, 400),
      [authoredRepId("1.1", "1.1a")]: rec(3, 3, 500),
      [authoredRepId("1.2", "1.2d")]: rec(1, 0, 600),
      "r|1.5|net-ports|1a2b3c4d": rec(1, 1, 700),
      "nonsense": rec(1, 1, 800),
    },
    stops: { "1.1": run(1), checkpoint: run(2) },
    checkpoint: { score: 70, at: 3, domains: [] },
    labs: { "firewall-acl-configuration": run(4), "incident-response-steps": run(5) },
    goal: { examDate: "2027-01-20", target: null, minutes: 20, at: 6 },
  };
  const { progress, answers, labs } = carryProgress(from, mapping);

  it("moves bank answers to the questions' copies and reps to where the newer version files them", () => {
    expect(progress.items).toEqual({
      [bankRepId("4.1", "q-new")]: rec(2, 1, 100),
      [bankRepId("2.5", "q-copy")]: rec(1, 0, 200),
      [authoredRepId("4.1", "1.2e")]: rec(1, 1, 400),
      [authoredRepId("1.1", "1.1a")]: rec(3, 3, 500),
    });
    expect(answers).toBe(4);
  });

  it("carries the labs it still plays and the goal, but no stops, checkpoint or rehearsal", () => {
    expect(progress.labs).toEqual({ "firewall-acl-configuration": run(4) });
    expect(labs).toBe(1);
    expect(progress.goal).toEqual(from.goal);
    expect(progress.stops).toEqual({});
    expect(progress.checkpoint).toBeNull();
    expect(progress.rehearsals).toEqual([]);
  });

  it("keeps the record with more answers when two land on one key", () => {
    const twice: PathProgress = {
      ...EMPTY_PATH_PROGRESS,
      items: { [bankRepId("2.5", "q-old")]: rec(1, 1, 900), [bankRepId("2.6", "q-old")]: rec(4, 2, 100) },
    };
    expect(carryProgress(twice, mapping).progress.items).toEqual({ [bankRepId("4.1", "q-new")]: rec(4, 2, 100) });
  });
});

describe("the SY0-701 → SY0-801 carry", () => {
  const sy0701 = PATH_CONTENT["security-plus-sy0-701"];
  const oldReps = new Map([...sy0701.authored, ...(sy0701.warmup.authored ?? [])].map((r) => [r.key, r]));
  const newReps = [...SY0_801_PATH_CONTENT.authored, ...(SY0_801_PATH_CONTENT.warmup.authored ?? [])];

  // A carried rep may swap a wrong option for SY0-801's term ("Deterrent" for
  // "Deterring"), but asks the same thing and wants the same answer, so a
  // learner's record on it still holds.
  it("carries only reps that ask the same thing and want the same answer on SY0-801", () => {
    let carried = 0;
    for (const rep of newReps) {
      const old = oldReps.get(rep.key);
      if (!old || rep.key in SY0_701_REWORDED) continue;
      carried++;
      // "Guard rails" and SY0-801's "Guardrails" are the same answer.
      const answer = (r: typeof rep) =>
        (r.kind === "choice" ? r.options[0] : r.answer).toLowerCase().replace(/[\s-]/g, "");
      expect({ kind: rep.kind, prompt: rep.prompt, answer: answer(rep) }, rep.key).toEqual({
        kind: old.kind,
        prompt: old.prompt,
        answer: answer(old),
      });
    }
    expect(carried).toBeGreaterThan(150);
  });

  it("accounts for every SY0-701 rep: carried, reworded or dropped", () => {
    const newKeys = new Set(newReps.map((r) => r.key));
    for (const key of oldReps.keys()) {
      expect(newKeys.has(key) || key in SY0_701_DROPPED, key).toBe(true);
    }
  });

  it("moves a question's answer to the copy migration 030 makes", () => {
    const copies = copiesJson as unknown as Record<string, [string, string]>;
    const [source, [copyId, objective]] = Object.entries(copies)[0];
    const from: PathProgress = { ...EMPTY_PATH_PROGRESS, items: { [bankRepId("1.1", source)]: rec(1, 1, 1) } };
    const mappingFromData: VersionMapping = { questions: copies, reps: {}, replacedLabs: SY0_801_MAP.replacedLabs };
    expect(Object.keys(carryProgress(from, mappingFromData).progress.items)).toEqual([bankRepId(objective, copyId)]);
  });
});
