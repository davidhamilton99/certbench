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
  /** The most rows the database gives to one answer, whatever range was asked for. */
  cap: 1000,
  /** Work handed to afterResponse, run by the test when it chooses. */
  later: [] as (() => unknown)[],
}));

vi.mock("@/server/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => {
      // Like the real service: the number of rows in the whole select, sent
      // only when the select asked for the exact count.
      let counted = false;
      const builder = {
        select: (_columns: string, options?: { count?: string }) => {
          counted = options?.count === "exact";
          return builder;
        },
        eq: () => builder,
        order: () => builder,
        range: async (from: number, to: number) => {
          database.ranges.push([from, to]);
          if (database.failure) return { data: null, error: database.failure, count: null };
          return {
            data: database.rows.slice(from, Math.min(to + 1, from + database.cap)),
            error: null,
            count: counted ? database.rows.length : null,
          };
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
// The report of a fault, watched: nothing is sent anywhere from a test.
const report = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/api/report-error", () => ({ reportServerError: report }));

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

/** Runs the work that was left for after the response, and whatever that work leaves in its turn (a report). */
async function runLater() {
  while (database.later.length > 0) {
    const work = database.later.splice(0);
    for (const run of work) await run();
  }
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
  database.cap = 1000;
  database.later = [];
  report.mockClear();
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

  it("reads a bank that fits in one page with one request, because it asks for the count", async () => {
    await loadPathBank(SLUG);
    expect(database.ranges).toEqual([[0, 999]]);
  });

  it("reads the whole bank when the database gives fewer rows to one answer than a page asks for", async () => {
    database.rows = rows(1008);
    database.cap = 400;
    const bank = await loadPathBank(SLUG);
    expect(bank?.questions).toHaveLength(1008);
    expect(bank?.byId.has("q-01007")).toBe(true);
    expect(database.ranges).toEqual([
      [0, 999],
      [400, 1399],
      [800, 1799],
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

  // The defect: a held bank was given out whatever its age. An instance left
  // idle for a day gave its first caller a day-old copy, and that caller could
  // be a page being rebuilt, which keeps what it is given for another day.
  describe("a held bank's upper age, two hours", () => {
    it("just short of two hours, still answers at once and refreshes after the response", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(2 * HOUR - 1);
      database.rows = rows(42);

      expect(await loadPathBank(SLUG)).toBe(old);
      expect(downloads()).toBe(1);
      expect(database.later).toHaveLength(1);
    });

    it("at two hours, makes the request wait for the fresh copy and does not give out the old one", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(2 * HOUR);
      database.rows = rows(42);

      const bank = await loadPathBank(SLUG);

      expect(bank).not.toBe(old);
      expect(bank?.questions).toHaveLength(42);
      expect(downloads()).toBe(2);
      // Nothing was left for after the response: the request itself waited.
      expect(database.later).toHaveLength(0);
      // The fresh copy is held like any other.
      expect(await loadPathBank(SLUG)).toBe(bank);
      expect(downloads()).toBe(2);
    });

    it("does the same after a day without a request", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(24 * HOUR);
      database.rows = rows(48);
      expect((await loadPathBank(SLUG))?.questions).toHaveLength(48);
    });

    it("shares one download between requests that find the bank too old together", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(3 * HOUR);
      database.rows = rows(42);

      const [a, b, c] = await Promise.all([loadPathBank(SLUG), loadPathBank(SLUG), loadPathBank(SLUG)]);

      expect(a?.questions).toHaveLength(42);
      expect(b).toBe(a);
      expect(c).toBe(a);
      expect(downloads()).toBe(2);
    });

    it("falls back to the held bank only when the refresh fails, and waits a minute before the next attempt", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(3 * HOUR);
      database.failure = { message: "connection refused" };

      // The request waited for the read, which was tried and failed, and was given the old copy.
      expect(await loadPathBank(SLUG)).toBe(old);
      expect(downloads()).toBe(2);
      expect(console.warn).toHaveBeenCalledTimes(1);

      // Within the minute the old copy is given at once, and the database is not asked on every request.
      vi.advanceTimersByTime(30 * 1000);
      expect(await loadPathBank(SLUG)).toBe(old);
      expect(await loadPathBank(SLUG)).toBe(old);
      expect(downloads()).toBe(2);

      // After the minute the next request waits again, and this time the database answers.
      vi.advanceTimersByTime(MINUTE);
      database.failure = null;
      database.rows = rows(44);
      const fresh = await loadPathBank(SLUG);
      expect(fresh?.questions).toHaveLength(44);
      expect(downloads()).toBe(3);
    });

    it("meets a failed refresh once when several requests waited for it together", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(3 * HOUR);
      database.failure = { message: "connection refused" };

      const all = await Promise.all([loadPathBank(SLUG), loadPathBank(SLUG), loadPathBank(SLUG)]);

      expect(all.every((bank) => bank === old)).toBe(true);
      expect(downloads()).toBe(2);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it("counts from the last successful read: a bank refreshed after a response starts its two hours again", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(HOUR + MINUTE);
      database.rows = rows(42);
      await loadPathBank(SLUG);
      await runLater();

      // Two and a half hours after the first read, but ninety minutes after the refresh.
      vi.advanceTimersByTime(HOUR + 30 * MINUTE);
      database.rows = rows(50);
      const bank = await loadPathBank(SLUG);
      expect(bank?.questions).toHaveLength(42);
      expect(database.later).toHaveLength(1);
    });

    it("does not count a failed refresh as a read: the bank it kept is still too old a minute later", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(HOUR + 58 * MINUTE);
      database.failure = { message: "connection refused" };
      // Under two hours: answered at once, and the refresh after the response fails.
      expect(await loadPathBank(SLUG)).toBe(old);
      await runLater();

      // Past two hours, and the minute after the failure is over: this request waits.
      vi.advanceTimersByTime(3 * MINUTE);
      database.failure = null;
      database.rows = rows(46);
      expect((await loadPathBank(SLUG))?.questions).toHaveLength(46);
      expect(database.later).toHaveLength(0);
    });
  });

  // The defect: a refresh that failed left one line in the log. Nobody served
  // the older bank can see that anything is wrong, so nothing else said so.
  describe("a refresh that failed is reported", () => {
    const PLACE = { route: "service:path-bank", kind: "service" };

    it("once, when it ran after the response", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(HOUR + MINUTE);
      database.failure = { message: "connection refused: db.internal:5432" };
      await loadPathBank(SLUG);
      await loadPathBank(SLUG);

      await runLater();

      expect(report).toHaveBeenCalledTimes(1);
      const [fault, place] = report.mock.calls[0] as unknown as [Error, typeof PLACE];
      expect(place).toEqual(PLACE);
      // The report names the service and carries none of the database's words.
      expect(fault.message).toBe("The question bank could not be refreshed");
      expect(JSON.stringify([fault.message, place])).not.toContain("connection refused");
    });

    it("once for every request that waited for it, and only after the response has gone", async () => {
      const old = await loadPathBank(SLUG);
      vi.advanceTimersByTime(3 * HOUR);
      database.failure = { message: "connection refused" };

      const all = await Promise.all([loadPathBank(SLUG), loadPathBank(SLUG), loadPathBank(SLUG)]);

      // Every request has its answer, and none of them waited for the report.
      expect(all.every((bank) => bank === old)).toBe(true);
      expect(report).not.toHaveBeenCalled();
      expect(database.later).toHaveLength(1);

      await runLater();
      expect(report).toHaveBeenCalledTimes(1);
      expect(report).toHaveBeenCalledWith(expect.any(Error), PLACE);
    });

    it("again for the next attempt that fails, a minute later, and not in between", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(3 * HOUR);
      database.failure = { message: "connection refused" };
      await loadPathBank(SLUG);
      await runLater();

      vi.advanceTimersByTime(30 * 1000);
      await loadPathBank(SLUG);
      await runLater();
      expect(report).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(MINUTE);
      await loadPathBank(SLUG);
      await runLater();
      expect(report).toHaveBeenCalledTimes(2);
    });

    it("and nothing is reported for a refresh that worked, late or waited for", async () => {
      await loadPathBank(SLUG);
      vi.advanceTimersByTime(HOUR + MINUTE);
      await loadPathBank(SLUG);
      await runLater();
      vi.advanceTimersByTime(3 * HOUR);
      await loadPathBank(SLUG);
      await runLater();
      expect(report).not.toHaveBeenCalled();
    });
  });

  it("fails a first load that cannot read the database, and reads again on the next request", async () => {
    database.failure = { message: "connection refused" };
    await expect(loadPathBank(SLUG)).rejects.toThrow("connection refused");
    // The failure is the request's own: whatever serves the request reports it.
    await runLater();
    expect(report).not.toHaveBeenCalled();
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

  it("gives an explanation without the lead that names the answer by its letter, and leaves any other as it is", async () => {
    database.rows = [
      { ...row(0), explanation: "Why A is correct: Syslog collects logs in one place. Option B only watches devices." },
      { ...row(1), explanation: `Why option A is the correct answer ${DASH} Syslog collects logs in one place.` },
      { ...row(2), explanation: "Syslog collects logs in one place, which is why A is correct." },
    ];
    const bank = await loadPathBank(SLUG);
    expect(bank?.questions.map((q) => q.explanation)).toEqual([
      "Syslog collects logs in one place. Option B only watches devices.",
      "Syslog collects logs in one place.",
      "Syslog collects logs in one place, which is why A is correct.",
    ]);
    // Only the words change: the answer stays where it is stored.
    expect(bank?.questions.map((q) => q.answer)).toEqual([0, 0, 0]);
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
