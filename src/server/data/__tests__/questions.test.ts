import { describe, expect, it } from "vitest";
import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { repairText } from "@/core/path/text";
import {
  countActiveQuestions,
  countQuestionsBySubObjective,
  getQuestionsByIds,
  getQuestionSubObjectiveMap,
  listActiveQuestions,
  listAnswerKeys,
  listDiagnosticQuestions,
  listQuestionDomains,
  listQuestionsBySubObjective,
  listSampleQuestions,
} from "../questions";

/** The dashes stored text can carry, named by their codes so that this file holds neither. */
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

type Row = Record<string, unknown>;
interface Call {
  name: string;
  args: unknown[];
}

/**
 * A stand-in for the Supabase client over a list of rows. It applies the
 * filters, the order, the range and the limit of each select, answers a head
 * count with a count and no rows, and keeps every chain it was asked for.
 */
function fakeDb(rows: Row[], failure?: { message: string; fromRow?: number }) {
  const queries: Call[][] = [];
  const answer = (calls: Call[]) => {
    const args = (name: string) => calls.filter((c) => c.name === name).map((c) => c.args);
    let found = [...rows];
    for (const [column, value] of args("eq")) found = found.filter((r) => r[column as string] === value);
    for (const [column, values] of args("in")) found = found.filter((r) => (values as unknown[]).includes(r[column as string]));
    for (const [column, op, value] of args("not")) {
      if (op === "is" && value === null) found = found.filter((r) => r[column as string] !== null);
    }
    for (const [column] of args("order")) {
      found.sort((a, b) => String(a[column as string]).localeCompare(String(b[column as string])));
    }
    const [select] = args("select");
    const options = select?.[1] as { count?: string; head?: boolean } | undefined;
    if (options?.head) return { data: null, count: found.length, error: failure ?? null };
    const [range] = args("range");
    if (failure && (failure.fromRow ?? 0) <= ((range?.[0] as number) ?? 0)) return { data: null, error: failure };
    if (range) found = found.slice(range[0] as number, (range[1] as number) + 1);
    const [limit] = args("limit");
    if (limit) found = found.slice(0, limit[0] as number);
    return { data: found, error: null };
  };
  const from = (table: string) => {
    const calls: Call[] = [{ name: "from", args: [table] }];
    queries.push(calls);
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "eq", "in", "not", "order", "range", "limit"]) {
      builder[name] = (...args: unknown[]) => {
        calls.push({ name, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(answer(calls)).then(resolve, reject);
    return builder;
  };
  /** The ranges asked for, in order. */
  const ranges = () => queries.flatMap((calls) => calls.filter((c) => c.name === "range").map((c) => c.args));
  return { db: { from } as unknown as Db, queries, ranges };
}

const CERT = "cert-sy0-801";

function row(i: number, overrides: Row = {}): Row {
  return {
    id: `q-${String(i).padStart(5, "0")}`,
    certification_id: CERT,
    domain_id: `domain-${(i % 5) + 1}`,
    sub_objective_id: `sub-${(i % 3) + 1}`,
    question_text: `Question ${i}?`,
    options: [
      { text: "Right", is_correct: true },
      { text: "Wrong one", is_correct: false },
      { text: "Wrong two", is_correct: false },
      { text: "Wrong three", is_correct: false },
    ],
    correct_index: 0,
    explanation: "Because.",
    difficulty: 2,
    is_active: true,
    is_diagnostic_eligible: i % 2 === 0,
    ...overrides,
  };
}

const rows = (n: number, overrides: Row = {}) => Array.from({ length: n }, (_, i) => row(i, overrides));

async function refusal(work: Promise<unknown>): Promise<ApiError> {
  const outcome = await work.then(
    (value) => value,
    (error: unknown) => error
  );
  expect(outcome).toBeInstanceOf(ApiError);
  return outcome as ApiError;
}

describe("a question read from the bank", () => {
  const stored = row(1, {
    question_text: `The organisation's firewall ${EM} by default ${EM} blocks inbound traffic. Which colour marks a blocked port?`,
    options: [
      { text: `Syslog ${EM} the centralised logging protocol`, is_correct: false },
      { text: "Red", is_correct: true },
    ],
    correct_index: 1,
    explanation: `TLS protects data in transit ${EN} it does not protect data at rest. A defence in depth programme adds more layers.`,
  });

  it("is shown in the house style: no dash between words, and American spelling", async () => {
    const [question] = await listActiveQuestions(fakeDb([stored]).db, CERT);

    expect(question.question_text).toBe(
      "The organization's firewall, by default, blocks inbound traffic. Which color marks a blocked port?"
    );
    expect(question.options.map((o) => o.text)).toEqual(["Syslog: the centralized logging protocol", "Red"]);
    expect(question.explanation).toBe(
      "TLS protects data in transit: it does not protect data at rest. A defense in depth program adds more layers."
    );

    const shown = [question.question_text, question.explanation, ...question.options.map((o) => o.text)].join(" ");
    expect(shown).not.toContain(EM);
    expect(shown).not.toContain(` ${EN} `);
    expect(shown).not.toMatch(/organisation|colour|centralised|defence|programme/);
  });

  it("is repaired by the same rule as every other piece of stored text", async () => {
    const [question] = await listActiveQuestions(fakeDb([stored]).db, CERT);
    expect(question.question_text).toBe(repairText(stored.question_text as string));
    expect(question.explanation).toBe(repairText(stored.explanation as string));
  });

  it("keeps everything else as it is stored: which option is correct, the ids, the difficulty", async () => {
    const [question] = await listActiveQuestions(fakeDb([stored]).db, CERT);
    expect(question.options.map((o) => o.is_correct)).toEqual([false, true]);
    expect(question.correct_index).toBe(1);
    expect(question).toMatchObject({
      id: "q-00001",
      certification_id: CERT,
      domain_id: "domain-2",
      sub_objective_id: "sub-2",
      difficulty: 2,
    });
  });

  it("is returned exactly as stored when it needs no repair", async () => {
    const plain = row(2, {
      question_text: "Which port does SSH use? A well-known, low-numbered port (below 1024).",
      explanation: "SSH uses port 22. It replaced Telnet, which uses port 23.",
    });
    const [question] = await listActiveQuestions(fakeDb([plain]).db, CERT);
    expect(question.question_text).toBe(plain.question_text);
    expect(question.explanation).toBe(plain.explanation);
    // A hyphen inside a word, and words that only look British, are left alone.
    expect(question.question_text).toContain("well-known");
  });

  it("has an empty explanation when none is stored", async () => {
    const [question] = await listActiveQuestions(fakeDb([row(3, { explanation: null })]).db, CERT);
    expect(question.explanation).toBe("");
  });

  it("is repaired the same way whichever read returns it", async () => {
    const { db } = fakeDb([stored]);
    const expected = "The organization's firewall, by default, blocks inbound traffic. Which color marks a blocked port?";
    expect((await getQuestionsByIds(db, ["q-00001"]))[0].question_text).toBe(expected);
    expect((await listSampleQuestions(db, CERT, 5))[0].question_text).toBe(expected);
    expect((await listQuestionsBySubObjective(db, "sub-2", 5))[0].question_text).toBe(expected);
  });

  it("fails loudly when its options are malformed, naming the question", async () => {
    const broken = row(4, { options: [{ text: "No flag for which option is correct" }] });
    const error = await refusal(listActiveQuestions(fakeDb([broken]).db, CERT));
    expect(error.code).toBe("internal");
    expect(error.message).toContain("q-00004");
  });
});

describe("reads that take every question of an exam", () => {
  it("reads all 1,008 active questions, not the first 1,000, a page at a time in id order", async () => {
    const bank = [...rows(1008), row(5000, { is_active: false }), row(6000, { certification_id: "another-exam" })];
    const { db, queries, ranges } = fakeDb(bank);

    const questions = await listActiveQuestions(db, CERT);

    expect(questions).toHaveLength(1008);
    expect(new Set(questions.map((q) => q.id)).size).toBe(1008);
    expect(questions[0].id).toBe("q-00000");
    expect(questions.at(-1)?.id).toBe("q-01007");
    expect(ranges()).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    for (const calls of queries) {
      expect(calls.find((c) => c.name === "order")?.args[0]).toBe("id");
    }
  });

  it("reads only the questions marked for the readiness check, however many there are", async () => {
    const { db, ranges } = fakeDb(rows(2400));
    const questions = await listDiagnosticQuestions(db, CERT);
    expect(questions).toHaveLength(1200);
    expect(ranges()).toHaveLength(2);
  });

  it("lists every question with its domain, retired questions included", async () => {
    const bank = [...rows(1005), row(7000, { is_active: false }), row(7001, { is_active: false })];
    const { db, ranges } = fakeDb(bank);
    const listed = await listQuestionDomains(db, CERT);
    expect(listed).toHaveLength(1007);
    expect(listed.filter((q) => !q.is_active)).toHaveLength(2);
    expect(ranges()).toHaveLength(2);
  });

  it("maps every tagged question to its objective, across pages", async () => {
    const bank = [...rows(1008), row(8000, { sub_objective_id: null })];
    const map = await getQuestionSubObjectiveMap(fakeDb(bank).db, CERT);
    expect(map.size).toBe(1008);
    expect(map.get("q-01007")).toBe("sub-3");
    expect(map.has("q-08000")).toBe(false);
  });

  it("counts the active questions of each objective, across pages", async () => {
    const bank = [...rows(1008), row(8000, { sub_objective_id: null }), row(8001, { is_active: false })];
    const counts = await countQuestionsBySubObjective(fakeDb(bank).db, CERT);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(1008);
    expect(counts.get("sub-1")).toBe(336);
    expect(counts.get("sub-2")).toBe(336);
    expect(counts.get("sub-3")).toBe(336);
  });

  it("fails when a later page fails, so part of a bank is never taken for all of it", async () => {
    const { db } = fakeDb(rows(1008), { message: "statement timeout", fromRow: 1000 });
    const error = await refusal(listActiveQuestions(db, CERT));
    expect(error.code).toBe("internal");
    await refusal(countQuestionsBySubObjective(db, CERT));
    await refusal(listQuestionDomains(db, CERT));
  });
});

describe("reads that take a known number of rows", () => {
  it("gives the answer key for this exam's active questions among the ids asked for, and nothing else", async () => {
    const bank = [
      row(1, { correct_index: 2 }),
      row(2, { correct_index: 0 }),
      row(3, { correct_index: 1, is_active: false }),
      row(4, { correct_index: 3, certification_id: "another-exam" }),
      row(5, { correct_index: 1 }),
    ];
    const { db } = fakeDb(bank);
    const keys = await listAnswerKeys(db, CERT, ["q-00001", "q-00002", "q-00003", "q-00004", "q-99999"]);
    expect(keys.map((k) => [k.id, k.correct_index])).toEqual([
      ["q-00001", 2],
      ["q-00002", 0],
    ]);
  });

  it("asks the database nothing when no ids are given", async () => {
    const { db, queries } = fakeDb(rows(5));
    expect(await listAnswerKeys(db, CERT, [])).toEqual([]);
    expect(await getQuestionsByIds(db, [])).toEqual([]);
    expect(queries).toHaveLength(0);
  });

  it("counts an exam's active questions without reading them", async () => {
    const bank = [...rows(1008), row(9000, { is_active: false })];
    const { db, queries } = fakeDb(bank);
    expect(await countActiveQuestions(db, CERT)).toBe(1008);
    const select = queries[0].find((c) => c.name === "select");
    expect(select?.args[1]).toEqual({ count: "exact", head: true });
  });

  it("takes a fixed sample for a public page, the same one every time", async () => {
    const { db } = fakeDb(rows(50));
    const first = await listSampleQuestions(db, CERT, 10);
    const again = await listSampleQuestions(db, CERT, 10);
    expect(first).toHaveLength(10);
    expect(first.map((q) => q.id)).toEqual(again.map((q) => q.id));
    expect(first[0].id).toBe("q-00000");
  });

  it("fails when the database refuses a bounded read", async () => {
    const { db } = fakeDb(rows(5), { message: "permission denied" });
    await refusal(getQuestionsByIds(db, ["q-00001"]));
    await refusal(listAnswerKeys(db, CERT, ["q-00001"]));
    await refusal(listSampleQuestions(db, CERT, 3));
    await refusal(countActiveQuestions(db, CERT));
  });
});
