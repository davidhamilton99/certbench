import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** One question row, as the database holds it. */
interface Row {
  id: string;
  domain_id: string;
  sub_objective_id: string | null;
  question_text: string;
  options: unknown;
  correct_index: number;
  explanation: string;
}

const database = vi.hoisted(() => ({
  rows: [] as unknown[],
  /** Whether the exam exists in the database. */
  hasCert: true,
  /** Set to make the read of the questions fail. */
  failure: null as { message: string } | null,
  /** The ranges the question select was asked for, in order. */
  ranges: [] as [number, number][],
  /** Work handed to afterResponse, run by the test when it chooses. */
  later: [] as (() => unknown)[],
}));

vi.mock("@/server/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: async (from: number, to: number) => {
          database.ranges.push([from, to]);
          if (database.failure) return { data: null, error: database.failure };
          return { data: database.rows.slice(from, to + 1), error: null };
        },
      };
      return builder;
    },
  }),
}));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async () =>
    database.hasCert ? { id: "cert-net", name: "CompTIA Network+", examCode: "N10-009" } : null,
  listDomains: async () => [
    { id: "d1", domainNumber: "1.0", title: "Networking concepts", examWeight: 23, sortOrder: 1 },
    { id: "d2", domainNumber: "2.0", title: "Network implementation", examWeight: 20, sortOrder: 2 },
  ],
  listSubObjectives: async () => [
    { id: "s11", code: "1.1", title: "OSI model", domain_id: "d1" },
    { id: "s21", code: "2.1", title: "Routing", domain_id: "d2" },
  ],
}));
vi.mock("@/server/api/after-response", () => ({
  afterResponse: (work: () => unknown) => {
    database.later.push(work);
  },
}));

import { forgetPathBanks, loadPathBank } from "../bank";

const SLUG = "network-plus-n10-009";
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
/** The em dash, as stored text carries it. Named by its code so that this file holds none. */
const DASH = String.fromCharCode(0x2014);

function row(i: number, text = `Question ${i}?`): Row {
  return {
    id: `q-${String(i).padStart(5, "0")}`,
    domain_id: i % 2 === 0 ? "d1" : "d2",
    sub_objective_id: i % 2 === 0 ? "s11" : "s21",
    question_text: text,
    options: [{ text: "Right" }, { text: "Wrong one" }, { text: "Wrong two" }, { text: "Wrong three" }],
    correct_index: 0,
    explanation: "Because.",
  };
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i));

/** Runs the work that was left for after the response. */
async function runLater() {
  const work = database.later.splice(0);
  for (const run of work) await run();
}

/** How many times the bank has been read from the database. */
const downloads = () => database.ranges.filter(([from]) => from === 0).length;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  forgetPathBanks();
  database.rows = rows(40);
  database.hasCert = true;
  database.failure = null;
  database.ranges = [];
  database.later = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("loadPathBank", () => {
  it("reads the exam's questions, placed in their domain and objective", async () => {
    const bank = await loadPathBank(SLUG);
    expect(bank?.certId).toBe("cert-net");
    expect(bank?.questions).toHaveLength(40);
    expect(bank?.questions[0]).toMatchObject({ id: "q-00000", domain: "1.0", objective: "1.1", answer: 0 });
    expect(bank?.questions[1]).toMatchObject({ domain: "2.0", objective: "2.1" });
    expect(bank?.byId.get("q-00007")?.text).toBe("Question 7?");
    expect(bank?.structure.examCode).toBe("N10-009");
  });

  it("reads a bank of more than 1,000 questions a page at a time, in a fixed order", async () => {
    database.rows = rows(1008);
    const bank = await loadPathBank(SLUG);
    expect(bank?.questions).toHaveLength(1008);
    expect(database.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("holds the bank: a second request reads nothing", async () => {
    const first = await loadPathBank(SLUG);
    const second = await loadPathBank(SLUG);
    expect(second).toBe(first);
    expect(downloads()).toBe(1);
  });

  it("shares one download between requests that arrive together", async () => {
    const [a, b, c] = await Promise.all([loadPathBank(SLUG), loadPathBank(SLUG), loadPathBank(SLUG)]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(downloads()).toBe(1);
  });

  it("keeps serving the held bank within the hour, without a refresh", async () => {
    await loadPathBank(SLUG);
    vi.advanceTimersByTime(HOUR - MINUTE);
    await loadPathBank(SLUG);
    expect(database.later).toHaveLength(0);
    expect(downloads()).toBe(1);
  });

  it("after an hour, answers at once with the held bank and refreshes it after the response", async () => {
    const held = await loadPathBank(SLUG);
    vi.advanceTimersByTime(HOUR + MINUTE);
    database.rows = rows(42);

    // The request is not kept waiting: it gets the copy already held.
    expect(await loadPathBank(SLUG)).toBe(held);
    expect(downloads()).toBe(1);
    // One refresh is asked for, however many requests arrive meanwhile.
    await loadPathBank(SLUG);
    expect(database.later).toHaveLength(1);

    await runLater();
    expect(downloads()).toBe(2);
    const fresh = await loadPathBank(SLUG);
    expect(fresh?.questions).toHaveLength(42);
    expect(database.later).toHaveLength(0);
  });

  it("keeps the held bank when a refresh fails, and tries again a minute later", async () => {
    const held = await loadPathBank(SLUG);
    vi.advanceTimersByTime(HOUR + MINUTE);
    database.failure = { message: "connection refused" };

    expect(await loadPathBank(SLUG)).toBe(held);
    await runLater();
    expect(console.warn).toHaveBeenCalled();

    // The fault costs nothing: the bank is still served, and not asked for on every request.
    expect(await loadPathBank(SLUG)).toBe(held);
    expect(database.later).toHaveLength(0);

    vi.advanceTimersByTime(MINUTE + 1000);
    database.failure = null;
    database.rows = rows(44);
    expect(await loadPathBank(SLUG)).toBe(held);
    expect(database.later).toHaveLength(1);
    await runLater();
    expect((await loadPathBank(SLUG))?.questions).toHaveLength(44);
  });

  it("fails a first load that cannot read the database, and reads again on the next request", async () => {
    database.failure = { message: "connection refused" };
    await expect(loadPathBank(SLUG)).rejects.toThrow("connection refused");
    database.failure = null;
    expect((await loadPathBank(SLUG))?.questions).toHaveLength(40);
  });

  it("answers null for an exam the database does not have, and does not hold that answer", async () => {
    database.hasCert = false;
    expect(await loadPathBank(SLUG)).toBeNull();
    database.hasCert = true;
    expect((await loadPathBank(SLUG))?.questions).toHaveLength(40);
  });

  it("shows stored text in the house style: no dash between words, American spelling", async () => {
    database.rows = [
      {
        ...row(0, `Which protocol ${DASH} by default ${DASH} does a centralised logging server use?`),
        options: [{ text: `Syslog ${DASH} UDP 514` }, { text: "SNMP" }],
        explanation: `Syslog is the standard ${DASH} it is organised around facilities.`,
      },
    ];
    const question = (await loadPathBank(SLUG))?.questions[0];
    const shown = [question?.text, question?.explanation, ...(question?.options ?? [])].join(" ");
    expect(shown).not.toContain(DASH);
    expect(shown).not.toMatch(/centralised|organised/);
    expect(shown).toContain("centralized");
  });

  it("leaves out a row whose options or answer are malformed", async () => {
    database.rows = [
      row(0),
      { ...row(1), options: "not a list" },
      { ...row(2), correct_index: 9 },
      { ...row(3), domain_id: "unknown-domain" },
    ];
    const bank = await loadPathBank(SLUG);
    expect(bank?.questions.map((q) => q.id)).toEqual(["q-00000"]);
  });
});
