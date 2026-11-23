import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PathBank } from "../bank";

/**
 * The table of what CertBench holds for each exam is the home page's and the
 * educators page's factual claim, so its order, its counts and its wording are
 * kept here. Nothing in this file reaches a database: the two reads the table
 * makes are replaced, and so is the bank that the home page's examples use.
 */
const db = vi.hoisted(() => ({
  /** Exam slug to its id; a slug that is absent is an exam the database does not have. */
  exams: {} as Record<string, string>,
  /** Exam id to its number of active questions. */
  counts: {} as Record<string, number>,
  /** Set to make the next reads fail, as a database fault would. */
  fail: null as "exam" | "count" | "bank" | null,
  bank: null as unknown,
  countCalls: [] as string[],
  bankCalls: [] as string[],
}));

vi.mock("@/server/supabase/anon", () => ({ createAnonClient: () => ({}) }));
vi.mock("@/server/data/certifications", () => ({
  getCertificationBySlug: async (_db: unknown, slug: string) => {
    if (db.fail === "exam") throw new Error("The database could not be reached.");
    return slug in db.exams ? { id: db.exams[slug], slug } : null;
  },
}));
vi.mock("@/server/data/questions", () => ({
  countActiveQuestions: async (_db: unknown, id: string) => {
    db.countCalls.push(id);
    if (db.fail === "count") throw new Error("The database could not be reached.");
    return db.counts[id] ?? 0;
  },
}));
vi.mock("../bank", () => ({
  loadPathBank: async (slug: string) => {
    db.bankCalls.push(slug);
    if (db.fail === "bank") throw new Error("The database could not be reached.");
    return db.bank;
  },
}));

import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { pbqRegistry } from "@/data/pbq";
import { practicePageFor } from "@/lib/seo/cert-pages";
import { SECURITY_PLUS_DOMAIN_CHANGES, SY0_801_PRACTICE_PATH } from "@/lib/seo/exam-versions";
import { examInventory, examStructure } from "../inventory";

const ORDER = [
  "security-plus-sy0-801",
  "security-plus-sy0-701",
  "network-plus-n10-009",
  "a-plus-core1-220-1201",
  "a-plus-core2-220-1202",
];

/** A bank whose weights are deliberately not CompTIA's, to show which source the page is given. */
function bankFor(slug: string, examCode: string, domainCount = 5): PathBank {
  const titles = [
    "General Security Concepts",
    "Threats, Vulnerabilities, and Mitigations",
    "Security Architecture",
    "Security Operations",
    "Security Program Management and Oversight",
  ];
  return {
    certId: `id-${slug}`,
    structure: {
      certSlug: slug,
      examName: "Security+",
      examCode,
      domains: titles.slice(0, domainCount).map((title, k) => ({
        number: `${k + 1}.0`,
        title,
        weight: 1,
        objectives: [{ code: `${k + 1}.1`, title: "An objective" }],
      })),
      library: [],
    },
    questions: [],
    byId: new Map(),
  };
}

beforeEach(() => {
  db.exams = Object.fromEntries(ORDER.map((slug) => [slug, `id-${slug}`]));
  db.counts = {
    "id-security-plus-sy0-801": 1008,
    "id-security-plus-sy0-701": 842,
    "id-network-plus-n10-009": 617,
    "id-a-plus-core1-220-1201": 651,
    "id-a-plus-core2-220-1202": 719,
  };
  db.fail = null;
  db.bank = null;
  db.countCalls = [];
  db.bankCalls = [];
});

describe("examInventory", () => {
  it("lists the five exams in the table's order, the newest Security+ first, each with its code", async () => {
    const rows = await examInventory();
    expect(rows.map((r) => r.cert)).toEqual(ORDER);
    expect(rows.map((r) => `${r.name} ${r.code}`)).toEqual([
      "Security+ SY0-801",
      "Security+ SY0-701",
      "Network+ N10-009",
      "A+ Core 1 220-1201",
      "A+ Core 2 220-1202",
    ]);
  });

  it("counts each exam's active questions with a count query, and never reads a bank to do it", async () => {
    const rows = await examInventory();
    expect(rows.map((r) => r.questions)).toEqual([1008, 842, 617, 651, 719]);
    expect([...db.countCalls].sort()).toEqual(ORDER.map((slug) => `id-${slug}`).sort());
    expect(db.bankCalls).toEqual([]);
  });

  it("says objectives where the numbering is CompTIA's, and topics for Network+, where it is not", async () => {
    const rows = await examInventory();
    for (const row of rows) {
      const count = Object.keys(OBJECTIVE_TITLES[row.cert]).length;
      expect(row.objectives).toBe(`${count} ${row.cert === "network-plus-n10-009" ? "topics" : "objectives"}`);
    }
    expect(rows.filter((r) => r.objectives.endsWith("topics")).map((r) => r.cert)).toEqual(["network-plus-n10-009"]);
  });

  it("counts each exam's labs from the lab registry", async () => {
    const rows = await examInventory();
    for (const row of rows) expect(row.labs).toBe(pbqRegistry[row.cert].length);
    expect(rows.every((r) => r.labs > 0)).toBe(true);
  });

  it("links every exam to its own free practice exam and its own study path", async () => {
    const rows = await examInventory();
    const full = REHEARSAL_FORMATS.full;
    for (const row of rows) {
      expect(row.exam.label).toBe(`${full.questions} questions in ${full.minutes} minutes`);
      expect(row.path).toBe(`/path/${row.cert}`);
      expect(row.exam.href).toBe(
        row.cert === "security-plus-sy0-801" ? SY0_801_PRACTICE_PATH : practicePageFor(row.cert)
      );
      expect(row.exam.href).toMatch(/^\/[a-z0-9-]+-practice-test$/);
    }
    // The two Security+ versions do not share a page.
    expect(rows[0].exam.href).not.toBe(rows[1].exam.href);
  });

  it("throws when a read fails, so that a page being rebuilt keeps its last good copy", async () => {
    db.fail = "count";
    await expect(examInventory()).rejects.toThrow("The database could not be reached.");
    db.fail = "exam";
    await expect(examInventory()).rejects.toThrow("The database could not be reached.");
  });

  it("leaves the count empty only for an exam that the database does not have", async () => {
    delete db.exams["network-plus-n10-009"];
    const rows = await examInventory();
    expect(rows.map((r) => r.questions)).toEqual([1008, 842, null, 651, 719]);
    // An exam with no active questions is counted as none, which is a figure and not a gap.
    db.counts["id-a-plus-core2-220-1202"] = 0;
    expect((await examInventory()).at(-1)?.questions).toBe(0);
  });
});

describe("examStructure", () => {
  it("gives the bank's own outline, with CompTIA's full domain names", async () => {
    const bank = bankFor("security-plus-sy0-701", "SY0-701");
    db.bank = bank;
    const structure = await examStructure("security-plus-sy0-701");
    expect(db.bankCalls).toEqual(["security-plus-sy0-701"]);
    expect(structure.examCode).toBe("SY0-701");
    expect(structure.domains.map((d) => d.title)).toEqual(bank.structure.domains.map((d) => d.title));
    expect(structure.domains.map((d) => d.objectives)).toEqual(bank.structure.domains.map((d) => d.objectives));
    expect(structure.library).toBe(bank.structure.library);
  });

  it("takes the Security+ domain weights from the record that was checked against CompTIA's pages", async () => {
    db.bank = bankFor("security-plus-sy0-701", "SY0-701");
    const v7 = await examStructure("security-plus-sy0-701");
    expect(v7.domains.map((d) => d.weight)).toEqual(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0701));
    expect(v7.domains.map((d) => d.weight)).toEqual([12, 22, 18, 28, 20]);

    db.bank = bankFor("security-plus-sy0-801", "SY0-801");
    const v8 = await examStructure("security-plus-sy0-801");
    expect(v8.domains.map((d) => d.weight)).toEqual(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801));
    expect(v8.domains.reduce((sum, d) => sum + d.weight, 0)).toBe(100);
  });

  it("keeps the bank's weights for an exam the record does not hold, or whose domains it does not match", async () => {
    db.bank = bankFor("network-plus-n10-009", "N10-009");
    expect((await examStructure("network-plus-n10-009")).domains.map((d) => d.weight)).toEqual([1, 1, 1, 1, 1]);
    db.bank = bankFor("security-plus-sy0-701", "SY0-701", 4);
    expect((await examStructure("security-plus-sy0-701")).domains.map((d) => d.weight)).toEqual([1, 1, 1, 1]);
  });

  it("does not change the bank that the study path is served from", async () => {
    const bank = bankFor("security-plus-sy0-701", "SY0-701");
    db.bank = bank;
    await examStructure("security-plus-sy0-701");
    expect(bank.structure.domains.map((d) => d.weight)).toEqual([1, 1, 1, 1, 1]);
  });

  it("throws when the bank cannot be read or the exam is missing, so the page keeps its last good copy", async () => {
    db.fail = "bank";
    await expect(examStructure("security-plus-sy0-701")).rejects.toThrow("The database could not be reached.");
    db.fail = null;
    db.bank = null;
    await expect(examStructure("security-plus-sy0-701")).rejects.toThrow(/security-plus-sy0-701/);
  });
});
