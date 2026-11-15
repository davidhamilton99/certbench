import { describe, expect, it } from "vitest";
import { HANDS_ON } from "@/core/path/labs";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";
import { SY0_801_AI_TOPICS, SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { aiThreatHunt as hunt } from "../ai-threat-hunt";

const evidence = hunt.lines.flatMap((line, i) => (line.malicious ? [i] : []));

describe("the SY0-801 AI threat hunt's shape", () => {
  it("is a hands-on threat hunt the path can play and save", () => {
    expect(hunt.type).toBe("threat-hunt");
    expect(HANDS_ON.has(hunt.type)).toBe(true);
    // Path progress keeps labs by scenario id, at most 64 characters (contracts/path.ts).
    expect(hunt.id).toMatch(/^[a-z0-9-]{1,64}$/);
    for (const text of [hunt.title, hunt.briefing, hunt.logSource, hunt.question, hunt.explanation]) {
      expect(text.trim()).not.toBe("");
    }
    expect(Number.isInteger(hunt.estimatedMinutes)).toBe(true);
    expect(hunt.estimatedMinutes).toBeGreaterThan(0);
  });

  it("sits in SY0-801's domain 2, under that domain's title", () => {
    expect(hunt.domain_number).toBe("2.0");
    expect(hunt.domain_title).toBe(SY0_801_DOMAINS.find((d) => d.number === "2.0")?.title);
  });

  it("mixes evidence with ordinary activity, and explains every line", () => {
    expect(evidence.length).toBeGreaterThanOrEqual(4);
    expect(hunt.lines.length - evidence.length).toBeGreaterThanOrEqual(4);
    expect(new Set(hunt.lines.map((l) => l.text)).size).toBe(hunt.lines.length);
    for (const line of hunt.lines) {
      expect(line.text.trim(), line.text).not.toBe("");
      // The reveal notes every evidence line, and any ordinary line flagged by mistake.
      expect(line.note?.trim(), line.text).toBeTruthy();
    }
  });

  it("reads in time order", () => {
    const times = hunt.lines.map((l) => /^(\d{2}:\d{2}:\d{2}) /.exec(l.text)?.[1] ?? "");
    for (const time of times) expect(time).not.toBe("");
    expect(times).toEqual([...times].sort());
  });

  it("has four different options and keys one of them", () => {
    expect(hunt.options).toHaveLength(4);
    expect(new Set(hunt.options).size).toBe(4);
    expect(Number.isInteger(hunt.correctOption)).toBe(true);
    expect(hunt.options[hunt.correctOption]).toBeDefined();
  });

  it("scores a perfect hunt 100, and flagging every line or none no better than 65", () => {
    const perfect = gradeThreatHunt(hunt, { flagged: evidence, attackChoice: hunt.correctOption });
    expect(perfect.score).toBe(100);
    expect(perfect.feedback).toEqual([]);
    const every = hunt.lines.map((_, i) => i);
    expect(gradeThreatHunt(hunt, { flagged: every, attackChoice: hunt.correctOption }).score).toBeLessThanOrEqual(65);
    expect(gradeThreatHunt(hunt, { flagged: [], attackChoice: hunt.correctOption }).score).toBeLessThanOrEqual(65);
  });
});

/** The steps the question asks about, in the order every option takes them, and the controls it offers. */
const STEPS = ["Hidden text", "HR server", "Payroll email", "Invented package"];
const CONTROLS = ["input filtering", "isolated sandbox", "human approval", "package allow list"];

/**
 * For each step, every control a reviewer could defend as stopping it at the
 * point it happened, the arguable ones included, so an option only counts as
 * wrong where no reading of it holds up.
 */
const DEFENSIBLE: Record<string, readonly string[]> = {
  // Only filtering acts on what the model reads; at this point there's no action to approve or contain.
  "Hidden text": ["input filtering"],
  // Asking a person before the code ran is arguable.
  "HR server": ["isolated sandbox", "human approval"],
  // The email went out through the assistant's own tool, not from the sandbox.
  "Payroll email": ["human approval"],
  // A sandbox with no network couldn't have fetched it, and a person could have refused the install.
  "Invented package": ["package allow list", "isolated sandbox", "human approval"],
};

const parse = (option: string) =>
  option
    .replace(/\u00a0/g, " ")
    .split(" · ")
    .map((pair) => {
      const [step, control, ...rest] = pair.split(" → ");
      return { step, control, extra: rest.length };
    });

describe("the SY0-801 AI threat hunt's question", () => {
  const options = hunt.options.map(parse);
  const wrongAt = options.map((pairs) => pairs.filter((p) => !DEFENSIBLE[p.step]?.includes(p.control)).length);

  it("pairs every step with one control in every option, each control once", () => {
    for (const pairs of options) {
      expect(pairs.map((p) => p.step)).toEqual(STEPS);
      expect(pairs.map((p) => p.control).sort()).toEqual([...CONTROLS].sort());
      expect(pairs.every((p) => p.extra === 0)).toBe(true);
    }
  });

  it("wraps on a phone only after an arrow or between pairs, never inside a label", () => {
    for (const option of hunt.options) {
      const pieces = option.split(" ");
      for (const piece of pieces.slice(0, -1)) expect(piece, option).toMatch(/[→·]$/);
    }
  });

  it("has exactly one defensible answer, the keyed one", () => {
    expect(wrongAt[hunt.correctOption]).toBe(0);
    expect(wrongAt.filter((n) => n === 0)).toHaveLength(1);
  });

  it("makes every other option wrong at two steps or more", () => {
    wrongAt.forEach((n, i) => {
      if (i !== hunt.correctOption) expect(n, hunt.options[i]).toBeGreaterThanOrEqual(2);
    });
  });

  it("takes more than one right pairing to find the answer", () => {
    // Every pairing in the answer also appears in a wrong option.
    options[hunt.correctOption].forEach((pair, s) => {
      const alsoIn = options.filter((pairs, i) => i !== hunt.correctOption && pairs[s].control === pair.control);
      expect(alsoIn.length, pair.step).toBeGreaterThan(0);
    });
  });
});

describe("the SY0-801 AI threat hunt's evidence", () => {
  it("shows every step the question asks about", () => {
    // A trace only that step leaves in the log.
    const traces: Record<string, string> = {
      "Hidden text": "hidden text",
      "HR server": "fs-hr01",
      "Payroll email": "send_email",
      "Invented package": "pdf-tablesift",
    };
    expect(Object.keys(traces)).toEqual(STEPS);
    for (const [step, trace] of Object.entries(traces)) {
      expect(hunt.lines.some((l) => l.malicious && l.text.includes(trace)), step).toBe(true);
    }
  });

  it("flags every line with the outside address, the HR server or the package, and none of the other session's", () => {
    const traces = ["vendor-records.test", "fs-hr01", "svc-ai-runner", "pdf-tablesift", "203.0.113.50"];
    for (const line of hunt.lines) {
      if (traces.some((t) => line.text.includes(t))) expect(line.malicious, line.text).toBe(true);
      if (line.text.includes(" s52 ")) expect(line.malicious, line.text).toBe(false);
    }
  });

  it("names the objective 2.6 threats it shows and the ones it rules out, in 2.6's terms", () => {
    const terms = SY0_801_AI_TOPICS.map((t) => t.term.toLowerCase());
    const named = ["prompt injection", "code execution", "data loss", "hallucination", "jailbreaking", "session hijacking", "poisoning"];
    for (const term of named) {
      expect(terms.some((t) => t.startsWith(term)), term).toBe(true);
      expect(hunt.explanation.toLowerCase(), term).toContain(term);
    }
  });

  it("points at nothing real: reserved domains, and private or documentation addresses", () => {
    const text = [
      hunt.briefing,
      hunt.logSource,
      hunt.question,
      hunt.explanation,
      ...hunt.options,
      ...hunt.lines.flatMap((l) => [l.text, l.note ?? ""]),
    ].join("\n");
    // example.com, example.net, example.org and .test are reserved for documentation and testing (RFC 2606).
    const hosts = text.match(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|ai|dev|app|co|info|biz|test|example)\b/gi) ?? [];
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) expect(host).toMatch(/(?:^|\.)example\.(?:com|net|org)$|\.test$/i);
    // Private ranges (RFC 1918) and documentation ranges (RFC 5737).
    const addresses = text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? [];
    expect(addresses.length).toBeGreaterThan(0);
    for (const address of addresses) {
      expect(address).toMatch(/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/);
    }
  });
});
