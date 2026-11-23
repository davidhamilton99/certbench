import { describe, expect, it } from "vitest";
import { getRecallDecks } from "@/data/recall";
import { referenceRegistry } from "@/data/reference";
import type { ReferenceTable } from "@/data/reference/types";
import { buildDeck, explainRow, type RecallDeckConfig, type ResolvedDeck } from "@/lib/recall/recall-deck";
import type { Rep } from "@/core/path/types";
import type { DrillMode } from "@/lib/tools/subnetting";
import { recallToRep, subnetToRep } from "../fact-reps";

/**
 * A recall fact as a question card. The card prints the takeaway straight
 * after its verdict, so these tests read it the way the card does: "Correct."
 * or "Incorrect. The correct answer is X.", then the takeaway.
 */

/** A fixed run of numbers: the first decides the direction (under 0.5 asks the other way round). */
const rngFrom = (first: number) => {
  let n = 0;
  return () => (n++ === 0 ? first : (n * 0.618) % 1);
};
const FORWARD = 0.9;
const BACK = 0.1;

const rightAnswer = (rep: Rep) => (rep.type === "choice" ? rep.options[rep.answer] : rep.answerText);
/** The two lines the card can print under a question. */
const verdicts = (rep: Rep) => [`Correct. ${rep.takeaway}`, `Incorrect. The correct answer is ${rightAnswer(rep)}. ${rep.takeaway}`];

const table: ReferenceTable = {
  id: "facts",
  title: "Facts",
  description: "",
  columnHeaders: [
    { key: "protocol", label: "Protocol" },
    { key: "port", label: "Port" },
    { key: "service", label: "Service / Use" },
    { key: "purpose", label: "Purpose" },
  ],
  entries: [
    { columns: { protocol: "SSH", port: "22", service: "Secure Shell: encrypted remote access", purpose: "Open an encrypted remote shell on a server" } },
    { columns: { protocol: "DHCP", port: "67/68", service: "Dynamic Host Configuration Protocol (server/client)", purpose: "Hand out addresses to hosts as they join" } },
    { columns: { protocol: "HTTPS", port: "443", service: "", purpose: "Browse the web over an encrypted connection" } },
    { columns: { protocol: "RDP", port: "3389", service: "Remote Desktop Protocol", purpose: "Use the desktop of a remote Windows computer" } },
  ],
};

const ports: RecallDeckConfig = {
  id: "ports",
  label: "Ports",
  tableId: "facts",
  mode: "choice",
  ask: { key: "protocol", label: "protocol" },
  answer: { key: "port", label: "port" },
  bidirectional: true,
  accept: "numeric-parts",
  detailKeys: ["service"],
};
const jobs: RecallDeckConfig = {
  id: "jobs",
  label: "Jobs",
  tableId: "facts",
  mode: "choice",
  ask: { key: "purpose", label: "purpose" },
  answer: { key: "protocol", label: "protocol" },
  detailKeys: ["service"],
};

describe("recallToRep: a deck with no explanation template keeps its note", () => {
  const deck = buildDeck(ports, table);

  it("pairs a short cue with its answer, and adds the first detail", () => {
    expect(recallToRep(deck, "SSH", "1.5", rngFrom(FORWARD), false).takeaway).toBe(
      "SSH: 22 (Secure Shell: encrypted remote access)"
    );
    // Asked the other way round, the port is the cue.
    const back = recallToRep(deck, "SSH", "1.5", rngFrom(BACK), false);
    expect(back.prompt).toBe("22");
    expect(back.takeaway).toBe("22: SSH (Secure Shell: encrypted remote access)");
    // Typed, it is always asked the deck's own way.
    const typed = recallToRep(deck, "SSH", "1.5", rngFrom(BACK), true);
    expect(typed).toMatchObject({ type: "typed", prompt: "SSH", answerText: "22" });
    expect(typed.takeaway).toBe("SSH: 22 (Secure Shell: encrypted remote access)");
  });

  it("leaves the parenthesis out when the row has no detail", () => {
    expect(recallToRep(deck, "HTTPS", "1.5", rngFrom(FORWARD), false).takeaway).toBe("HTTPS: 443");
    const bare = buildDeck({ ...ports, id: "bare", detailKeys: undefined }, table);
    expect(recallToRep(bare, "SSH", "1.5", rngFrom(FORWARD), false).takeaway).toBe("SSH: 22");
  });

  it("does not repeat a long cue back: the answer and its detail", () => {
    const long = buildDeck(jobs, table);
    expect(recallToRep(long, "Open an encrypted remote shell on a server", "1.5", rngFrom(FORWARD), false).takeaway).toBe(
      "SSH: Secure Shell: encrypted remote access"
    );
    expect(recallToRep(long, "Browse the web over an encrypted connection", "1.5", rngFrom(FORWARD), false).takeaway).toBe("HTTPS");
  });
});

describe("recallToRep: a deck with an explanation template explains in sentences", () => {
  const explained = buildDeck(
    {
      ...ports,
      id: "ports-explained",
      explain: {
        template: "{protocol} uses port {port}.",
        rows: { DHCP: "{protocol} uses ports 67 and 68. The server uses port 67, and the client uses port 68." },
      },
    },
    table
  );

  it("reads on from either verdict, whichever way round the fact was asked", () => {
    const forward = recallToRep(explained, "SSH", "1.5", rngFrom(FORWARD), false);
    expect(forward.prompt).toBe("SSH");
    expect(verdicts(forward)).toEqual(["Correct. SSH uses port 22.", "Incorrect. The correct answer is 22. SSH uses port 22."]);

    const back = recallToRep(explained, "SSH", "1.5", rngFrom(BACK), false);
    expect(back.prompt).toBe("22");
    expect(verdicts(back)).toEqual(["Correct. SSH uses port 22.", "Incorrect. The correct answer is SSH. SSH uses port 22."]);

    const typed = recallToRep(explained, "SSH", "1.5", rngFrom(BACK), true);
    expect(typed.type).toBe("typed");
    expect(verdicts(typed)).toEqual(["Correct. SSH uses port 22.", "Incorrect. The correct answer is 22. SSH uses port 22."]);
  });

  it("uses a row's own sentences where its cells do not fit the template", () => {
    const sentences = "DHCP uses ports 67 and 68. The server uses port 67, and the client uses port 68.";
    expect(recallToRep(explained, "DHCP", "1.5", rngFrom(FORWARD), false).takeaway).toBe(sentences);
    expect(recallToRep(explained, "DHCP", "1.5", rngFrom(BACK), false).takeaway).toBe(sentences);
  });

  it("changes nothing else about the question", () => {
    const plain = buildDeck(ports, table);
    for (const first of [FORWARD, BACK]) {
      for (const typed of [false, true]) {
        const a = recallToRep(plain, "RDP", "1.5", rngFrom(first), typed);
        const b = recallToRep(explained, "RDP", "1.5", rngFrom(first), typed);
        // The id carries the deck's own id; the takeaway is the sentence.
        expect({ ...b, id: "", takeaway: "" }).toEqual({ ...a, id: "", takeaway: "" });
        expect(a.takeaway).toMatch(/^(?:RDP: 3389|3389: RDP) \(Remote Desktop Protocol\)$/);
        expect(b.takeaway).toBe("RDP uses port 3389.");
      }
    }
  });

  it("keeps the note for a row whose sentence names a cell the row does not have", () => {
    const holed = buildDeck({ ...ports, id: "holed", explain: { template: "{protocol} uses port {port}. It is {service}." } }, table);
    expect(recallToRep(holed, "RDP", "1.5", rngFrom(FORWARD), false).takeaway).toBe("RDP uses port 3389. It is Remote Desktop Protocol.");
    // HTTPS has no service cell: the note, not a sentence with a hole in it.
    expect(recallToRep(holed, "HTTPS", "1.5", rngFrom(FORWARD), false).takeaway).toBe("HTTPS: 443");
  });
});

describe("recallToRep: every curated and derived deck", () => {
  const DECKS: { cert: string; deck: ResolvedDeck }[] = Object.keys(referenceRegistry).flatMap((cert) =>
    getRecallDecks(cert).map((deck) => ({ cert, deck }))
  );
  const itemsOf = (deck: ResolvedDeck) => [...new Set(deck.rows.map((row) => row[deck.config.ask.key]))];
  /** Every card a deck can deal for one fact: asked each way, and typed where it can be. */
  const cardsFor = (deck: ResolvedDeck, item: string) => [
    recallToRep(deck, item, "1.1", rngFrom(FORWARD), false),
    recallToRep(deck, item, "1.1", rngFrom(BACK), false),
    ...(deck.typeable ? [recallToRep(deck, item, "1.1", rngFrom(BACK), true)] : []),
  ];

  /**
   * The row a card asked. A cue stands for one row in nearly every deck, and
   * for two where the table has them (RADIUS has a pair of ports and a pair of
   * legacy ports): the card's other cell, its answer or its prompt, says which.
   */
  const rowAsked = (deck: ResolvedDeck, item: string, rep: Rep) =>
    deck.rows.filter(
      (row) => row[deck.config.ask.key] === item && [rep.prompt, rightAnswer(rep)].includes(row[deck.config.answer.key])
    );

  it("gives the deck's sentences on every card of a deck that has a template", () => {
    const explained = DECKS.filter(({ deck }) => deck.config.explain);
    // Six decks of Network+ and A+, and the six of Security+.
    expect(explained.length).toBeGreaterThanOrEqual(12);
    let cards = 0;
    for (const { cert, deck } of explained) {
      for (const item of itemsOf(deck)) {
        for (const rep of cardsFor(deck, item)) {
          const at = `${cert}/${deck.config.id}: ${item}`;
          const rows = rowAsked(deck, item, rep);
          expect(rows, at).toHaveLength(1);
          const sentences = explainRow(deck.config, rows[0]);
          expect(sentences, at).not.toBeNull();
          expect(rep.takeaway, at).toBe(sentences);
          cards++;
        }
      }
    }
    expect(cards).toBeGreaterThan(1100);
  });

  it("explains the row that was asked when a cue stands for two rows", () => {
    const ports = getRecallDecks("security-plus-sy0-701").find((deck) => deck.config.id === "sec-ports")!;
    const legacy = "RADIUS uses ports 1645 and 1646. These are its legacy ports.";
    const current = "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting.";
    const dealt = new Map<string, string>();
    // The second number decides which of the two rows is dealt.
    for (const second of [0.1, 0.9]) {
      for (const first of [FORWARD, BACK]) {
        for (const typed of [false, true]) {
          let n = 0;
          const rep = recallToRep(ports, "RADIUS", "1.1", () => (n++ === 0 ? first : second), typed);
          const [row] = rowAsked(ports, "RADIUS", rep);
          dealt.set(row.port, rep.takeaway);
          // The verdict names the pair of ports that the sentences are about.
          if (typed || first === FORWARD) expect(verdicts(rep)[1]).toBe(`Incorrect. The correct answer is ${row.port}. ${rep.takeaway}`);
          else expect(rep.prompt).toBe(row.port);
        }
      }
    }
    expect(Object.fromEntries(dealt)).toEqual({ "1645/1646": legacy, "1812/1813": current });
  });

  it("prints the sentence the public acronym quiz shows, whichever way round it asks", () => {
    const acronyms = getRecallDecks("security-plus-sy0-701").find((deck) => deck.config.id === "sec-acronyms")!;
    const forward = recallToRep(acronyms, "MFA", "", rngFrom(FORWARD), false);
    expect(forward.prompt).toBe("MFA");
    expect(verdicts(forward)).toEqual([
      "Correct. MFA stands for Multifactor Authentication.",
      "Incorrect. The correct answer is Multifactor Authentication. MFA stands for Multifactor Authentication.",
    ]);
    const back = recallToRep(acronyms, "MFA", "", rngFrom(BACK), false);
    expect(back.prompt).toBe("Multifactor Authentication");
    expect(verdicts(back)).toEqual([
      "Correct. MFA stands for Multifactor Authentication.",
      "Incorrect. The correct answer is MFA. MFA stands for Multifactor Authentication.",
    ]);
  });

  it("keeps the note on every card of a deck that has none", () => {
    const plain = DECKS.filter(({ deck }) => !deck.config.explain);
    expect(plain.length).toBeGreaterThan(0);
    for (const { cert, deck } of plain) {
      for (const item of itemsOf(deck)) {
        for (const rep of cardsFor(deck, item)) {
          const at = `${cert}/${deck.config.id}: ${rep.takeaway}`;
          const answer = rightAnswer(rep);
          if (rep.prompt.length > 24) {
            // The answer first, then its first detail if the row has one.
            expect(rep.takeaway === answer || rep.takeaway.startsWith(`${answer}: `), at).toBe(true);
          } else {
            expect(rep.takeaway === `${rep.prompt}: ${answer}` || rep.takeaway.startsWith(`${rep.prompt}: ${answer} (`), at).toBe(true);
          }
        }
      }
    }
  });

  it("still names the number in a subnet fact's note", () => {
    const chart = getRecallDecks("network-plus-n10-009").find((deck) => deck.config.tableId === "subnetting-chart")!;
    expect(chart.config.explain).toBeUndefined();
    for (const item of itemsOf(chart)) {
      expect(recallToRep(chart, item, "1.4", rngFrom(FORWARD), false).takeaway).toMatch(/ \([\d,]+ usable hosts\)$/);
    }
  });
});

describe("a subnetting problem as a question card", () => {
  /** A repeatable run of numbers, so that every mode is dealt many different problems. */
  const seeded = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
      return a / 4294967296;
    };
  };
  const dealt = (mode: DrillMode, n = 200) => {
    const rng = seeded(801);
    return Array.from({ length: n }, () => subnetToRep("1.4", mode, rng));
  };
  const TYPED: DrillMode[] = ["binary", "cidr-mask", "network-id", "broadcast-range", "host-math"];

  it("asks a typed problem in one whole sentence, with its value inside it", () => {
    for (const mode of TYPED) {
      for (const rep of dealt(mode)) {
        expect(rep.type, mode).toBe("typed");
        expect(rep.prompt, rep.prompt).toMatch(/^[A-Z].*[.?]$/);
        // The old composition printed "What is the network address of 10.0.0.1 /26?" from two halves
        // and left an instruction such as "Convert to 8-bit binary 172" without its full stop.
        expect(rep.prompt, rep.prompt).not.toMatch(/\?\s|\.\s*\d+$/);
        expect(rep.cue).toBe("Your answer");
      }
    }
  });

  it("gives the yes or no problem its question and puts the two addresses under it", () => {
    for (const rep of dealt("same-subnet")) {
      expect(rep.type).toBe("choice");
      expect(rep.prompt).toBe("Are these two addresses on the same subnet?");
      expect(rep.cue).toMatch(/^\d+\.\d+\.\d+\.\d+ and \d+\.\d+\.\d+\.\d+ {2}\/\d+$/);
      if (rep.type === "choice") expect(rep.options).toEqual(["Yes", "No"]);
    }
  });

  it("prints sentences after the verdict and under 'Read the full explanation'", () => {
    for (const mode of [...TYPED, "same-subnet"] as DrillMode[]) {
      for (const rep of dealt(mode, 60)) {
        expect(rep.takeaway, rep.takeaway).toMatch(/^[A-Z].*\.$/);
        if (rep.explanation) expect(rep.explanation, rep.explanation).toMatch(/^[A-Z].*\.$/);
      }
    }
  });

  it("offers an example of the answer's form that is never the answer", () => {
    for (const mode of TYPED) {
      for (const rep of dealt(mode)) {
        if (rep.type !== "typed") continue;
        expect(rep.placeholder, rep.prompt).toBeTruthy();
        expect(rep.placeholder, rep.prompt).not.toBe(rep.answerText);
        expect(rep.accept, rep.prompt).not.toContain(rep.placeholder?.replace(/^\//, ""));
      }
    }
  });
});
