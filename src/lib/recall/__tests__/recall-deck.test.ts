import { describe, expect, it } from "vitest";
import type { ReferenceTable } from "@/data/reference/types";
import { getRecallDecks } from "@/data/recall";
import { referenceRegistry } from "@/data/reference";
import { acceptableAnswers, normalizeAnswer } from "../normalize";
import {
  autoDeckConfig,
  buildDeck,
  explainRow,
  generateRecallQuestion,
  gradeRecall,
  isDataRate,
  otherAnswers,
  otherAnswersSentence,
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

  it("takes a CIDR prefix with or without its slash, like the subnetting grader", () => {
    expect(acceptableAnswers("/30")).toEqual(["/30", "30"]);
    expect(acceptableAnswers("/64")).toContain("64");
    // Only a bare prefix: a port pair isn't one.
    expect(acceptableAnswers("20/21")).toEqual(["20/21"]);
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

  it("throws on a column that is not in the table", () => {
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

  it("drills only the rows a deck asks for, when it says", () => {
    const deck = buildDeck({ ...base, only: (row) => row.note === "crypto" }, synthetic);
    expect(deck.rows.map((r) => r.term)).toEqual(["AES", "RSA", "TLS"]);
  });

  it("drops placeholders, which would only be giveaways or junk distractors", () => {
    const placeholders: ReferenceTable = {
      ...synthetic,
      entries: [
        ...synthetic.entries,
        { columns: { term: "T568B", def: "N/A", note: "" } },
        { columns: { term: "VGA", def: "N/A (analog signal)", note: "" } },
        { columns: { term: "—", def: "Not a term", note: "" } },
      ],
    };
    const deck = buildDeck(base, placeholders);
    expect(deck.rows.map((r) => r.term)).toEqual(synthetic.entries.map((e) => e.columns.term));
  });
});

describe("detail line", () => {
  const subnets: ReferenceTable = {
    id: "subnets",
    title: "Subnets",
    description: "",
    columnHeaders: [
      { key: "cidr", label: "CIDR" },
      { key: "mask", label: "Subnet Mask" },
      { key: "hosts", label: "Usable Hosts" },
      { key: "ad", label: "Default AD" },
      { key: "port", label: "Port" },
      { key: "note", label: "Note" },
    ],
    entries: [
      { columns: { cidr: "/30", mask: "255.255.255.252", hosts: "2", ad: "1", port: "49", note: "Point-to-point links" } },
      { columns: { cidr: "/29", mask: "255.255.255.248", hosts: "6", ad: "1", port: "88", note: "Small sites" } },
      { columns: { cidr: "/22", mask: "255.255.252.0", hosts: "1,022", ad: "1", port: "443", note: "Four /24s" } },
    ],
  };
  const deck = buildDeck(
    {
      id: "s",
      label: "s",
      tableId: "subnets",
      mode: "choice",
      ask: { key: "mask", label: "subnet mask" },
      answer: { key: "cidr", label: "cidr" },
      detailKeys: ["hosts", "ad", "port", "note"],
    },
    subnets
  );

  it("names a bare number by its column: a count number-first, an identifier label-first", () => {
    expect(generateRecallQuestion(deck, seeded(1), { itemId: "255.255.255.252" }).details).toEqual([
      "2 usable hosts",
      "default AD 1",
      "port 49",
      "Point-to-point links",
    ]);
    expect(generateRecallQuestion(deck, seeded(1), { itemId: "255.255.252.0" }).details[0]).toBe("1,022 usable hosts");
  });

  it("lists one detail for each detail column that has a value, and none for a deck without details", () => {
    const sparse: ReferenceTable = {
      ...subnets,
      entries: [...subnets.entries, { columns: { cidr: "/28", mask: "255.255.255.240", hosts: "14", ad: "", port: "", note: "" } }],
    };
    const some = buildDeck({ ...deck.config, id: "sparse" }, sparse);
    expect(generateRecallQuestion(some, seeded(1), { itemId: "255.255.255.240" }).details).toEqual(["14 usable hosts"]);
    const none = buildDeck({ ...deck.config, id: "plain", detailKeys: undefined }, subnets);
    expect(generateRecallQuestion(none, seeded(1), { itemId: "255.255.255.252" }).details).toEqual([]);
  });
});

describe("explanation in sentences", () => {
  const ports: ReferenceTable = {
    id: "ports",
    title: "Ports",
    description: "",
    columnHeaders: [
      { key: "port", label: "Port" },
      { key: "protocol", label: "Protocol" },
      { key: "service", label: "Service / Use" },
      { key: "purpose", label: "Purpose" },
    ],
    entries: [
      { columns: { port: "22", protocol: "SSH", service: "Secure Shell: encrypted remote access", purpose: "Remote shell access" } },
      { columns: { port: "67/68", protocol: "DHCP", service: "Dynamic Host Configuration Protocol (server/client)", purpose: "DNS and gateway settings" } },
      { columns: { port: "443", protocol: "HTTPS", service: "", purpose: "Secure web browsing" } },
      { columns: { port: "3389", protocol: "RDP", service: "N/A (see the notes)", purpose: "Windows remote desktop" } },
    ],
  };
  const base: RecallDeckConfig = {
    id: "p",
    label: "p",
    tableId: "ports",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    detailKeys: ["service"],
  };
  const row = (protocol: string) => ports.entries.find((e) => e.columns.protocol === protocol)!.columns;

  it("fills the deck's template from the row", () => {
    const config: RecallDeckConfig = { ...base, explain: { template: "{protocol} uses port {port}." } };
    expect(explainRow(config, row("SSH"))).toBe("SSH uses port 22.");
    expect(explainRow(config, row("HTTPS"))).toBe("HTTPS uses port 443.");
  });

  it("gives a row its own sentences where its cells do not fit the template", () => {
    const config: RecallDeckConfig = {
      ...base,
      explain: {
        template: "{protocol} uses port {port}.",
        rows: { DHCP: "{protocol} uses ports 67 and 68. The server uses port 67, and the client uses port 68." },
      },
    };
    expect(explainRow(config, row("DHCP"))).toBe(
      "DHCP uses ports 67 and 68. The server uses port 67, and the client uses port 68."
    );
    // The other rows keep the template.
    expect(explainRow(config, row("SSH"))).toBe("SSH uses port 22.");
  });

  it("names a row by the column the deck says, the cue column when it does not say", () => {
    const rows = { "22": "Port 22 belongs to SSH." };
    expect(explainRow({ ...base, explain: { template: "{protocol} uses port {port}.", rows, by: "port" } }, row("SSH"))).toBe(
      "Port 22 belongs to SSH."
    );
    // By the cue column (the protocol), "22" names no row.
    expect(explainRow({ ...base, explain: { template: "{protocol} uses port {port}.", rows } }, row("SSH"))).toBe(
      "SSH uses port 22."
    );
  });

  it("sets a cell that opens with a capital inside a sentence, and leaves an acronym as it is", () => {
    const config: RecallDeckConfig = { ...base, explain: { template: "{protocol} provides {purpose:lowerFirst}." } };
    expect(explainRow(config, row("SSH"))).toBe("SSH provides remote shell access.");
    expect(explainRow(config, row("DHCP"))).toBe("DHCP provides DNS and gateway settings.");
    // Only where the template asks for it.
    expect(explainRow({ ...base, explain: { template: "{purpose} is what {protocol} provides." } }, row("SSH"))).toBe(
      "Remote shell access is what SSH provides."
    );
  });

  it("gives no explanation when the deck has no template", () => {
    expect(explainRow(base, row("SSH"))).toBeNull();
  });

  it("gives no explanation, rather than a sentence with a hole, when a cell it names is missing", () => {
    const config: RecallDeckConfig = { ...base, explain: { template: "{protocol} uses port {port}. It is {service}." } };
    // A blank cell, a placeholder cell and a column the table does not have.
    expect(explainRow(config, row("HTTPS"))).toBeNull();
    expect(explainRow(config, row("RDP"))).toBeNull();
    expect(explainRow({ ...base, explain: { template: "{protocol} uses {transport}." } }, row("SSH"))).toBeNull();
    // A place written wrongly would be printed with its braces.
    expect(explainRow({ ...base, explain: { template: "{protocol} uses {port:plural}." } }, row("SSH"))).toBeNull();
    expect(explainRow({ ...base, explain: { template: "{protocol} uses port {port}}." } }, row("SSH"))).toBeNull();
  });

  it("does not take a name that every object carries for a cell or for a row's own sentences", () => {
    expect(explainRow({ ...base, explain: { template: "{protocol} is {constructor}." } }, row("SSH"))).toBeNull();
    const config: RecallDeckConfig = { ...base, explain: { template: "{protocol} uses port {port}.", rows: {}, by: "purpose" } };
    expect(explainRow(config, { ...row("SSH"), purpose: "toString" })).toBe("SSH uses port 22.");
  });

  it("puts the explanation on the question, the same one whichever way round it is asked", () => {
    const explained = buildDeck({ ...base, explain: { template: "{protocol} uses port {port}." } }, ports);
    const asked = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const q = generateRecallQuestion(explained, seeded(seed), { itemId: "SSH" });
      asked.add(q.askLabel);
      expect(q.explanation).toBe("SSH uses port 22.");
    }
    expect(asked).toEqual(new Set(["protocol", "port"]));
    expect(generateRecallQuestion(explained, seeded(1), { itemId: "SSH", noSwap: true }).explanation).toBe("SSH uses port 22.");
  });

  it("leaves the explanation off the question for a deck without a template", () => {
    const plain = buildDeck(base, ports);
    const q = generateRecallQuestion(plain, seeded(1), { itemId: "SSH" });
    expect(q).not.toHaveProperty("explanation");
    expect(q.details).toEqual(["Secure Shell: encrypted remote access"]);
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
    expect(q.details).toHaveLength(1);
    expect(["crypto", "network", "iam"]).toContain(q.details[0]);
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
      expect(q.options).toContain(q.answer);
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

describe("duplicate-cue safety", () => {
  it("never offers two valid answers for a cue mapping to multiple rows", () => {
    const table: ReferenceTable = {
      id: "dup",
      title: "d",
      description: "",
      columnHeaders: [
        { key: "cue", label: "Cue" },
        { key: "ans", label: "Ans" },
      ],
      entries: [
        { columns: { cue: "RADIUS", ans: "1812" } },
        { columns: { cue: "RADIUS", ans: "1645" } },
        { columns: { cue: "SSH", ans: "22" } },
        { columns: { cue: "HTTP", ans: "80" } },
        { columns: { cue: "DNS", ans: "53" } },
      ],
    };
    const deck = buildDeck(
      { id: "t", label: "t", tableId: "dup", mode: "choice", ask: { key: "cue", label: "cue" }, answer: { key: "ans", label: "ans" } },
      table
    );
    const rng = seeded(3);
    let sawRadius = false;
    for (let i = 0; i < 500; i++) {
      const q = generateRecallQuestion(deck, rng);
      if (q.promptValue !== "RADIUS") continue;
      sawRadius = true;
      // Both 1812 and 1645 are valid for RADIUS; only the shown answer may appear.
      const validInOptions = q.options.filter((o) => o === "1812" || o === "1645");
      expect(validInOptions).toEqual([q.answer]);
    }
    expect(sawRadius).toBe(true);
  });
});

describe("a cue that names more than one row", () => {
  // RADIUS has a row for its ports and a row for its legacy ports, as the
  // Security+ ports table has. The question deals one of the two.
  const table: ReferenceTable = {
    id: "two-rows",
    title: "Two rows",
    description: "",
    columnHeaders: [
      { key: "protocol", label: "Protocol" },
      { key: "port", label: "Port" },
    ],
    entries: [
      { columns: { protocol: "RADIUS", port: "1645/1646" } },
      { columns: { protocol: "RADIUS", port: "1812/1813" } },
      { columns: { protocol: "SSH", port: "22" } },
      { columns: { protocol: "HTTPS", port: "443" } },
      { columns: { protocol: "TACACS+", port: "49" } },
    ],
  };
  const config: RecallDeckConfig = {
    id: "two",
    label: "Two",
    tableId: "two-rows",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    accept: "numeric-parts",
  };
  const deck = buildDeck(config, table);

  /** One typed question about RADIUS for each of its rows (a typed answer is asked the deck's own way). */
  function radiusQuestions() {
    const dealt = new Map<string, ReturnType<typeof generateRecallQuestion>>();
    for (let seed = 0; seed < 60; seed++) {
      const q = generateRecallQuestion(deck, seeded(seed), { itemId: "RADIUS", noSwap: true });
      dealt.set(q.answer, q);
    }
    return dealt;
  }

  it("accepts a typed answer from any of the cue's rows, whichever row was dealt", () => {
    const dealt = radiusQuestions();
    expect([...dealt.keys()].sort()).toEqual(["1645/1646", "1812/1813"]);
    for (const [answer, q] of dealt) {
      // The port that every candidate learns, and the legacy one, whole or as one of the pair.
      for (const typed of ["1812", "1813", "1812/1813", "1645", "1646", "1645/1646", " 1812 "]) {
        expect(gradeRecall(q, typed), `dealt ${answer}, typed ${typed}`).toBe(true);
      }
      for (const typed of ["49", "22", "1814", ""]) {
        expect(gradeRecall(q, typed), `dealt ${answer}, typed ${typed}`).toBe(false);
      }
      // The row that was dealt is still the one the question shows as its answer.
      expect(q.acceptable[0]).toBe(answer);
    }
  });

  it("accepts nothing more for a cue that names one row", () => {
    const q = generateRecallQuestion(deck, seeded(1), { itemId: "SSH", noSwap: true });
    expect(q.acceptable).toEqual(["22"]);
    expect(gradeRecall(q, "1812")).toBe(false);
  });

  it("accepts only the whole answers of the cue's rows where the deck grades exactly", () => {
    const exact = buildDeck({ ...config, id: "exact", accept: "exact" }, table);
    const q = generateRecallQuestion(exact, seeded(1), { itemId: "RADIUS", noSwap: true });
    expect([...q.acceptable].sort()).toEqual(["1645/1646", "1812/1813"]);
  });

  it("names the other answers of a cue from the two cells a question showed", () => {
    expect(otherAnswers(deck, "RADIUS", "1645/1646")).toEqual(["1812/1813"]);
    expect(otherAnswers(deck, "RADIUS", "1812/1813")).toEqual(["1645/1646"]);
    // One row for the cue: nothing else is correct.
    expect(otherAnswers(deck, "SSH", "22")).toEqual([]);
    // Asked the other way round, the port is the cue, and one protocol has it.
    expect(otherAnswers(deck, "1645/1646", "RADIUS")).toEqual([]);
    // Two cells that are not a row of the deck.
    expect(otherAnswers(deck, "RADIUS", "22")).toEqual([]);
    expect(otherAnswers(deck, "LDAP", "389")).toEqual([]);
  });

  it("reads the other way round only where the deck asks both ways", () => {
    const shared: ReferenceTable = {
      ...table,
      entries: [
        { columns: { protocol: "SSH", port: "22" } },
        { columns: { protocol: "SFTP", port: "22" } },
        { columns: { protocol: "HTTPS", port: "443" } },
      ],
    };
    expect(otherAnswers(buildDeck(config, shared), "22", "SSH")).toEqual(["SFTP"]);
    expect(otherAnswers(buildDeck({ ...config, bidirectional: false }, shared), "22", "SSH")).toEqual([]);
  });

  it("says which answer the question asked for, and that the other is correct too", () => {
    expect(otherAnswersSentence("RADIUS", "1645/1646", ["1812/1813"])).toBe(
      "This question asked for 1645/1646. Another correct answer for RADIUS is 1812/1813."
    );
    expect(otherAnswersSentence("22", "SSH", ["SCP", "SFTP"])).toBe(
      "This question asked for SSH. Other correct answers for 22 are SCP and SFTP."
    );
    expect(otherAnswersSentence("22", "SSH", ["SCP", "SFTP", "Telnet"])).toBe(
      "This question asked for SSH. Other correct answers for 22 are SCP, SFTP and Telnet."
    );
    expect(otherAnswersSentence("SSH", "22", [])).toBeNull();
  });

  it("holds for every such cue in every deck of every exam, RADIUS in the Security+ ports among them", () => {
    const slugs = ["security-plus-sy0-701", "network-plus-n10-009", "a-plus-core1-220-1201", "a-plus-core2-220-1202"];
    const found: string[] = [];
    for (const slug of slugs) {
      for (const real of getRecallDecks(slug)) {
        const { ask, answer } = real.config;
        for (const cue of new Set(real.rows.map((row) => row[ask.key]))) {
          const answers = [...new Set(real.rows.filter((row) => row[ask.key] === cue).map((row) => row[answer.key]))];
          if (answers.length < 2) continue;
          found.push(`${slug}/${real.config.id}: ${cue}`);
          for (const dealt of answers) {
            const others = otherAnswers(real, cue, dealt);
            expect([dealt, ...others].sort(), `${cue}: ${dealt}`).toEqual([...answers].sort());
            expect(otherAnswersSentence(cue, dealt, others), `${cue}: ${dealt}`).toMatch(
              /^This question asked for .+\. (?:Another correct answer for .+ is|Other correct answers for .+ are) .+\.$/
            );
          }
          // Whichever row a typed question deals, the answer of every row is accepted.
          for (let seed = 0; seed < 40; seed++) {
            const q = generateRecallQuestion(real, seeded(seed), { itemId: cue, noSwap: true });
            for (const valid of answers) expect(gradeRecall(q, valid), `${cue}: dealt ${q.answer}, typed ${valid}`).toBe(true);
          }
        }
      }
    }
    expect(found).toContain("security-plus-sy0-701/sec-ports: RADIUS");
  });

  it("marks a typed 1812 correct for RADIUS on the real Security+ ports deck, whichever row is dealt", () => {
    const ports = getRecallDecks("security-plus-sy0-701").find((d) => d.config.id === "sec-ports")!;
    const dealt = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const q = generateRecallQuestion(ports, seeded(seed), { itemId: "RADIUS", noSwap: true });
      dealt.add(q.answer);
      expect(gradeRecall(q, "1812"), `dealt ${q.answer}`).toBe(true);
      expect(gradeRecall(q, "1645"), `dealt ${q.answer}`).toBe(true);
      expect(gradeRecall(q, "49"), `dealt ${q.answer}`).toBe(false);
    }
    expect([...dealt].sort()).toEqual(["1645/1646", "1812/1813"]);
  });
});

describe("confusable distractors", () => {
  it("draws distractors from the answer's category when grouped", () => {
    const table: ReferenceTable = {
      id: "acr",
      title: "A",
      description: "",
      columnHeaders: [
        { key: "acr", label: "Acronym" },
        { key: "exp", label: "Expansion" },
        { key: "cat", label: "Category" },
      ],
      entries: [
        { columns: { acr: "AES", exp: "Advanced Encryption Standard", cat: "Crypto" } },
        { columns: { acr: "RSA", exp: "Rivest Shamir Adleman", cat: "Crypto" } },
        { columns: { acr: "SHA", exp: "Secure Hash Algorithm", cat: "Crypto" } },
        { columns: { acr: "PKI", exp: "Public Key Infrastructure", cat: "Crypto" } },
        { columns: { acr: "DNS", exp: "Domain Name System", cat: "Network" } },
        { columns: { acr: "ARP", exp: "Address Resolution Protocol", cat: "Network" } },
        { columns: { acr: "NAT", exp: "Network Address Translation", cat: "Network" } },
        { columns: { acr: "BGP", exp: "Border Gateway Protocol", cat: "Network" } },
      ],
    };
    const deck = buildDeck(
      {
        id: "t",
        label: "t",
        tableId: "acr",
        mode: "choice",
        ask: { key: "acr", label: "acronym" },
        answer: { key: "exp", label: "expansion" },
        distractorGroupKey: "cat",
        detailKeys: ["cat"],
      },
      table
    );
    const catOf: Record<string, string> = {};
    for (const e of table.entries) catOf[e.columns.exp] = e.columns.cat;

    const rng = seeded(7);
    for (let i = 0; i < 300; i++) {
      const q = generateRecallQuestion(deck, rng);
      // Each category has 4 members → 3 same-category distractors available, so
      // every option shares the answer's category.
      for (const opt of q.options) {
        expect(catOf[opt], `${q.promptValue}: ${opt}`).toBe(catOf[q.answer]);
      }
    }
  });
});

describe("typed mode", () => {
  it("marks short-answer decks typeable and long-answer decks not", () => {
    const decks = getRecallDecks("security-plus-sy0-701");
    const ports = decks.find((d) => d.config.tableId === "ports-protocols")!;
    const acronyms = decks.find((d) => d.config.tableId === "acronyms")!;
    expect(ports.typeable).toBe(true);
    expect(acronyms.typeable).toBe(false);
  });

  it("noSwap always asks in the deck's default direction", () => {
    // Ports is bidirectional (protocol <-> port); noSwap must always ask
    // protocol -> port, so you type the port, never a long protocol name.
    const ports = getRecallDecks("security-plus-sy0-701").find(
      (d) => d.config.tableId === "ports-protocols"
    )!;
    const rng = seeded(11);
    for (let i = 0; i < 200; i++) {
      const q = generateRecallQuestion(ports, rng, { noSwap: true });
      expect(q.answerLabel).toBe("port");
      expect(gradeRecall(q, q.answer)).toBe(true);
    }
  });
});

describe("all recall decks (every cert)", () => {
  const slugs = [
    "security-plus-sy0-701",
    "network-plus-n10-009",
    "a-plus-core1-220-1201",
    "a-plus-core2-220-1202",
  ];

  it("Security+ covers its curated tables plus auto-derived ones", () => {
    const tableIds = getRecallDecks("security-plus-sy0-701").map((d) => d.config.tableId);
    expect(tableIds).toEqual(
      expect.arrayContaining(["acronyms", "ports-protocols", "encryption-algorithms", "attack-types", "authentication-types"])
    );
  });

  it("names every deck and every table in sentence case, with 'and' written out", () => {
    // These names are the tabs of the Recall and Reference pages.
    const names = slugs.flatMap((slug) => [
      ...referenceRegistry[slug].map((table) => table.title),
      ...getRecallDecks(slug).map((deck) => deck.config.label),
    ]);
    expect(names.length).toBeGreaterThanOrEqual(48);
    // A proper name keeps its capital wherever it stands; an abbreviation (OSI, AAA, CIDR, CLI) is all capitals.
    const PROPER = /^(?:Windows|Linux|Wi-Fi)$/;
    for (const name of names) {
      expect(name, name).toMatch(/^[A-Z]/);
      expect(name, name).not.toMatch(/[&/]/);
      const capitalized = name.split(" ").slice(1).filter((word) => /^[A-Z][a-z]/.test(word) && !PROPER.test(word));
      expect(capitalized, name).toEqual([]);
    }
  });

  it("no deck in any cert drills a placeholder like N/A", () => {
    for (const slug of slugs) {
      for (const deck of getRecallDecks(slug)) {
        for (const row of deck.rows) {
          for (const key of [deck.config.ask.key, deck.config.answer.key]) {
            expect(row[key], `${slug}/${deck.config.id}`).not.toMatch(/^n\/a\b/i);
          }
        }
      }
    }
  });

  it("asks only for real data rates in every speed deck", () => {
    const speedDecks = slugs.flatMap((slug) => getRecallDecks(slug)).filter((d) => d.config.answer.label === "max speed");
    expect(speedDecks.map((d) => d.config.id).sort()).toEqual(["a1-cables", "a1-storage", "a1-wireless", "net-cables"]);
    for (const deck of speedDecks) {
      expect(deck.rows.length, deck.config.id).toBeGreaterThanOrEqual(4);
      for (const row of deck.rows) {
        expect(isDataRate(row[deck.config.answer.key]), `${deck.config.id}: ${row[deck.config.ask.key]}`).toBe(true);
      }
    }
    // RAID levels describe a speed-up rather than having a speed.
    const storage = speedDecks.find((d) => d.config.id === "a1-storage")!;
    expect(storage.rows.some((r) => r.type.startsWith("RAID"))).toBe(false);
  });

  it("builds every deck as plain data, so a server page can hand it to the browser", () => {
    // A curated deck's `only` filter once rode along in its config, and the
    // Recall page failed to render for all of Network+ and A+ Core 1.
    const plain = (value: unknown, at: string): void => {
      if (value === null || ["string", "number", "boolean", "undefined"].includes(typeof value)) return;
      expect(typeof value, at).toBe("object");
      if (Array.isArray(value)) {
        value.forEach((v, i) => plain(v, `${at}[${i}]`));
        return;
      }
      expect(Object.getPrototypeOf(value), at).toBe(Object.prototype);
      for (const [key, v] of Object.entries(value as object)) plain(v, `${at}.${key}`);
    };
    for (const slug of slugs) {
      for (const deck of getRecallDecks(slug)) plain(deck, `${slug}/${deck.config.id}`);
    }
  });

  it("phrases both directions of a two-way deck as real questions", () => {
    for (const slug of slugs) {
      for (const deck of getRecallDecks(slug).filter((d) => d.config.bidirectional)) {
        for (const label of [deck.config.ask.label, deck.config.answer.label]) {
          // "Which name?", "Which name / gen?" and "Which how to open?" all happened.
          expect(label, `${slug}/${deck.config.id}`).not.toMatch(/^(?:name|how\b)|\//);
        }
      }
    }
  });

  it("asks which Windows tool does a job, and shows how to open it", () => {
    const deck = getRecallDecks("a-plus-core2-220-1202").find((d) => d.config.tableId === "windows-tools")!;
    expect(deck.config.id).toBe("a2-tools");
    const q = generateRecallQuestion(deck, seeded(3), { itemId: "View system, application, and security event logs" });
    expect(q).toMatchObject({ answer: "Event Viewer", answerLabel: "tool", details: ["eventvwr.msc"] });
  });

  it("drills OSI layers by name and number, both ways", () => {
    for (const slug of ["network-plus-n10-009", "security-plus-sy0-701"]) {
      const deck = getRecallDecks(slug).find((d) => d.config.tableId === "osi-model")!;
      const labels = new Set(Array.from({ length: 30 }, (_, i) => generateRecallQuestion(deck, seeded(i)).answerLabel));
      expect(labels, slug).toEqual(new Set(["layer", "layer number"]));
    }
  });

  it("asks Network+ Wi-Fi bands for 802.11 standards only", () => {
    const deck = getRecallDecks("network-plus-n10-009").find((d) => d.config.tableId === "wireless-standards")!;
    expect(deck.rows.map((r) => r.standard)).toEqual(["802.11a", "802.11b", "802.11g", "802.11n", "802.11ac", "802.11ax"]);
    expect(deck.config.answer.label).toBe("frequency band");
  });

  it("every deck across every cert generates self-consistent questions", () => {
    const rng = seeded(2026);
    for (const slug of slugs) {
      const decks = getRecallDecks(slug);
      expect(decks.length, slug).toBeGreaterThan(0);
      for (const deck of decks) {
        for (let i = 0; i < 200; i++) {
          const q = generateRecallQuestion(deck, rng);
          expect(gradeRecall(q, q.answer), `${slug}/${deck.config.id}: ${q.promptValue}`).toBe(true);
          if (q.mode === "choice") {
            expect(q.options.length).toBeGreaterThanOrEqual(2);
            expect(q.options.length).toBeLessThanOrEqual(4);
            expect(new Set(q.options).size).toBe(q.options.length);
            expect(q.options).toContain(q.answer);
          }
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

  it("names its study groupings in sentence case, with 'and' written out", () => {
    // The grouping is printed in the Category column of the public acronym list and of the Reference page.
    const groupings = [...new Set(table.entries.map((e) => e.columns.category))];
    expect(groupings.length).toBeGreaterThanOrEqual(10);
    for (const name of groupings) {
      expect(name, name).toMatch(/^[A-Z]/);
      expect(name, name).not.toMatch(/&/);
      expect(name.split(" ").slice(1).filter((word) => /^[A-Z][a-z]/.test(word)), name).toEqual([]);
    }
  });

  it("expansions are unique too", () => {
    const expansions = table.entries.map((e) => e.columns.expansion);
    expect(new Set(expansions).size).toBe(expansions.length);
  });
});
