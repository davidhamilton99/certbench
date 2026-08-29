import { describe, expect, it } from "vitest";
import type { ReferenceTable } from "@/data/reference/types";
import { getRecallDecks } from "@/data/recall";
import { referenceRegistry } from "@/data/reference";
import { acceptableAnswers, normalizeAnswer } from "../normalize";
import {
  autoDeckConfig,
  buildDeck,
  generateRecallQuestion,
  gradeRecall,
  type RecallDeckConfig,
  type Rng,
} from "../recall-deck";

/** Deterministic RNG (mulberry32) so generator sweeps are reproducible. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const synthetic: ReferenceTable = {
  id: "synthetic",
  title: "Synthetic",
  description: "",
  columnHeaders: [
    { key: "term", label: "Term" },
    { key: "def", label: "Definition" },
    { key: "note", label: "Note" },
  ],
  entries: [
    { columns: { term: "AES", def: "Advanced Encryption Standard", note: "crypto" } },
    { columns: { term: "RSA", def: "Rivest Shamir Adleman", note: "crypto" } },
    { columns: { term: "TLS", def: "Transport Layer Security", note: "crypto" } },
    { columns: { term: "DNS", def: "Domain Name System", note: "network" } },
    { columns: { term: "ARP", def: "Address Resolution Protocol", note: "network" } },
    { columns: { term: "SSO", def: "Single Sign-On", note: "iam" } },
  ],
};

describe("normalize", () => {
  it("is forgiving about case, spacing, and surrounding punctuation", () => {
    expect(normalizeAnswer("  Single  Sign-On.  ")).toBe("single sign-on");
    expect(normalizeAnswer("SSH/SCP/SFTP")).toBe("ssh/scp/sftp");
    expect(normalizeAnswer("")).toBe("");
  });

  it("accepts an individual port from a compound answer", () => {
    const forms = acceptableAnswers("20/21", "numeric-parts");
    expect(forms).toContain("20/21");
    expect(forms).toContain("20");
    expect(forms).toContain("21");
    // Exact mode never splits.
    expect(acceptableAnswers("20/21", "exact")).toEqual(["20/21"]);
  });

  it("splits range and slash separators", () => {
    expect(acceptableAnswers("137-139", "numeric-parts")).toEqual(
      expect.arrayContaining(["137-139", "137", "139"])
    );
  });
});

describe("buildDeck validation", () => {
  const base: RecallDeckConfig = {
    id: "t",
    label: "t",
    tableId: "synthetic",
    mode: "choice",
    ask: { key: "term", label: "term" },
    answer: { key: "def", label: "definition" },
  };

  it("throws on a column that isn't in the table", () => {
    expect(() =>
      buildDeck({ ...base, answer: { key: "nope", label: "x" } }, synthetic)
    ).toThrow(/not in table/);
  });

  it("throws when a table has too few rows to drill", () => {
    const thin: ReferenceTable = {
      ...synthetic,
      entries: synthetic.entries.slice(0, 2),
    };
    expect(() => buildDeck(base, thin)).toThrow(/usable rows/);
  });

  it("throws when the answer column has no distractors", () => {
    const flat: ReferenceTable = {
      ...synthetic,
      entries: [
        { columns: { term: "A", def: "same", note: "" } },
        { columns: { term: "B", def: "same", note: "" } },
        { columns: { term: "C", def: "same", note: "" } },
      ],
    };
    expect(() => buildDeck(base, flat)).toThrow(/distinct/);
  });

  it("drops rows missing either drilled field", () => {
    const holey: ReferenceTable = {
      ...synthetic,
      entries: [
        ...synthetic.entries,
        { columns: { term: "X", def: "", note: "" } },
      ],
    };
    const deck = buildDeck(base, holey);
    expect(deck.rows).toHaveLength(synthetic.entries.length);
  });
});

describe("generateRecallQuestion (choice)", () => {
  const deck = buildDeck(
    {
      id: "t",
      label: "t",
      tableId: "synthetic",
      mode: "choice",
      ask: { key: "term", label: "term" },
      answer: { key: "def", label: "definition" },
      bidirectional: true,
      detailKeys: ["note"],
    },
    synthetic
  );

  it("always offers four distinct options including the answer", () => {
    const rng = seeded(1);
    for (let i = 0; i < 500; i++) {
      const q = generateRecallQuestion(deck, rng);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
    }
  });

  it("grades its own answer correct and a wrong option incorrect", () => {
    const rng = seeded(2);
    for (let i = 0; i < 500; i++) {
      const q = generateRecallQuestion(deck, rng);
      expect(gradeRecall(q, q.answer)).toBe(true);
      const wrong = q.options.find((o) => o !== q.answer)!;
      expect(gradeRecall(q, wrong)).toBe(false);
    }
  });

  it("drills both directions when bidirectional", () => {
    const rng = seeded(3);
    const askLabels = new Set<string>();
    for (let i = 0; i < 200; i++) {
      askLabels.add(generateRecallQuestion(deck, rng).askLabel);
    }
    expect(askLabels).toEqual(new Set(["term", "definition"]));
  });

  it("surfaces detail on the chosen row", () => {
    const q = generateRecallQuestion(deck, seeded(4));
    expect(["crypto", "network", "iam"]).toContain(q.detail);
  });

  it("tags each question with a stable item id from the cue column", () => {
    const terms = new Set(synthetic.entries.map((e) => e.columns.term));
    expect(deck.itemCount).toBe(terms.size);
    const rng = seeded(5);
    for (let i = 0; i < 200; i++) {
      const q = generateRecallQuestion(deck, rng);
      expect(q.tableId).toBe("synthetic");
      // The item id is always a cue-column value, even when direction flips.
      expect(terms.has(q.itemId)).toBe(true);
    }
  });
});

describe("generateRecallQuestion (type)", () => {
  const ports: ReferenceTable = {
    id: "p",
    title: "P",
    description: "",
    columnHeaders: [
      { key: "protocol", label: "Protocol" },
      { key: "port", label: "Port" },
    ],
    entries: [
      { columns: { protocol: "FTP", port: "20/21" } },
      { columns: { protocol: "SSH", port: "22" } },
      { columns: { protocol: "HTTP", port: "80" } },
      { columns: { protocol: "HTTPS", port: "443" } },
      { columns: { protocol: "SNMP", port: "161/162" } },
    ],
  };
  const deck = buildDeck(
    {
      id: "pt",
      label: "pt",
      tableId: "p",
      mode: "type",
      ask: { key: "protocol", label: "protocol" },
      answer: { key: "port", label: "port" },
      accept: "numeric-parts",
    },
    ports
  );

  it("has no options and accepts a component of a compound port", () => {
    const rng = seeded(9);
    let sawCompound = false;
    for (let i = 0; i < 300; i++) {
      const q = generateRecallQuestion(deck, rng);
      expect(q.options).toHaveLength(0);
      expect(gradeRecall(q, q.answer)).toBe(true);
      expect(gradeRecall(q, "  ")).toBe(false);
      if (q.answer === "20/21") {
        sawCompound = true;
        expect(gradeRecall(q, "21")).toBe(true);
        expect(gradeRecall(q, "20")).toBe(true);
        expect(gradeRecall(q, "23")).toBe(false);
      }
    }
    expect(sawCompound).toBe(true);
  });
});

describe("autoDeckConfig", () => {
  it("derives a valid, self-consistent deck from a plain table", () => {
    const cfg = autoDeckConfig(synthetic);
    expect(cfg).not.toBeNull();
    expect(cfg!.mode).toBe("choice");
    const deck = buildDeck(cfg!, synthetic);
    const rng = seeded(1);
    for (let i = 0; i < 200; i++) {
      const q = generateRecallQuestion(deck, rng);
      expect(gradeRecall(q, q.answer)).toBe(true);
    }
  });

  it("returns null for a single-column table", () => {
    const oneCol: ReferenceTable = {
      id: "x",
      title: "x",
      description: "",
      columnHeaders: [{ key: "a", label: "A" }],
      entries: [{ columns: { a: "1" } }, { columns: { a: "2" } }],
    };
    expect(autoDeckConfig(oneCol)).toBeNull();
  });
});

describe("real Security+ recall decks", () => {
  const decks = getRecallDecks("security-plus-sy0-701");

  it("covers the curated tables plus auto-derived ones", () => {
    const tableIds = decks.map((d) => d.config.tableId);
    // Curated
    expect(tableIds).toEqual(expect.arrayContaining(["acronyms", "ports-protocols", "encryption-algorithms"]));
    // Auto-derived from the remaining reference tables
    expect(decks.length).toBeGreaterThan(3);
  });

  it("every generated question is self-consistent across a sweep", () => {
    const rng = seeded(2026);
    for (const deck of decks) {
      for (let i = 0; i < 400; i++) {
        const q = generateRecallQuestion(deck, rng);
        expect(gradeRecall(q, q.answer), `${deck.config.id}: ${q.promptValue}`).toBe(true);
        if (q.mode === "choice") {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.options.length).toBeLessThanOrEqual(4);
          expect(new Set(q.options).size).toBe(q.options.length);
          expect(q.options).toContain(q.answer);
        }
      }
    }
  });
});

describe("acronyms data integrity", () => {
  const table = referenceRegistry["security-plus-sy0-701"].find(
    (t) => t.id === "acronyms"
  )!;

  it("exists and is substantial", () => {
    expect(table).toBeDefined();
    expect(table.entries.length).toBeGreaterThanOrEqual(200);
  });

  it("every entry has an acronym, expansion, and category", () => {
    for (const { columns } of table.entries) {
      expect(columns.acronym?.trim()).toBeTruthy();
      expect(columns.expansion?.trim()).toBeTruthy();
      expect(columns.category?.trim()).toBeTruthy();
    }
  });

  it("acronyms are unique, so the drill is never ambiguous", () => {
    const acronyms = table.entries.map((e) => e.columns.acronym);
    expect(new Set(acronyms).size).toBe(acronyms.length);
  });

  it("expansions are unique too", () => {
    const expansions = table.entries.map((e) => e.columns.expansion);
    expect(new Set(expansions).size).toBe(expansions.length);
  });
});
