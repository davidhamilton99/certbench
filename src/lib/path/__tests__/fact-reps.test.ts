import { describe, expect, it } from "vitest";
import { getRecallDecks } from "@/data/recall";
import { RECALL_QUESTIONS } from "@/data/recall/questions";
import { PATH_CONTENT } from "@/data/path";
import { referenceRegistry } from "@/data/reference";
import { recallRepId } from "@/core/path/rep-id";
import type { ReferenceTable } from "@/data/reference/types";
import {
  buildDeck,
  explainRow,
  otherAnswers,
  otherAnswersSentence,
  type RecallDeckConfig,
  type ResolvedDeck,
} from "@/lib/recall/recall-deck";
import type { PathCert, Rep } from "@/core/path/types";
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
  const cardsFor = (deck: ResolvedDeck, item: string) => cardsWithCue(deck, item).map(({ rep }) => rep);
  /**
   * The same cards, each with the cue it asked about. The cue is the card's
   * prompt, except where the deck asks in sentences (src/data/recall/questions.ts):
   * there it is the cell that the sentence names, the fact's item asked the
   * deck's own way and its answer cell asked the other way (those decks have
   * one row for each item, which a test below holds).
   */
  const cardsWithCue = (deck: ResolvedDeck, item: string) => {
    const reversedCue = () => deck.rows.find((row) => row[deck.config.ask.key] === item)![deck.config.answer.key];
    const cueOf = (rep: Rep, reversed: boolean) =>
      RECALL_QUESTIONS[deck.config.id] ? (reversed ? reversedCue() : item) : rep.prompt;
    const back = deck.config.bidirectional === true;
    return [
      { rep: recallToRep(deck, item, "1.1", rngFrom(FORWARD), false), reversed: false },
      { rep: recallToRep(deck, item, "1.1", rngFrom(BACK), false), reversed: back },
      ...(deck.typeable ? [{ rep: recallToRep(deck, item, "1.1", rngFrom(BACK), true), reversed: false }] : []),
    ].map(({ rep, reversed }) => ({ rep, cue: cueOf(rep, reversed), reversed }));
  };

  /**
   * The row a card asked. A cue stands for one row in nearly every deck, and
   * for two where the table has them (RADIUS has a pair of ports and a pair of
   * legacy ports): the card's other cell, its answer or its cue, says which.
   */
  const rowAsked = (deck: ResolvedDeck, item: string, rep: Rep, cue = rep.prompt) =>
    deck.rows.filter(
      (row) => row[deck.config.ask.key] === item && [cue, rightAnswer(rep)].includes(row[deck.config.answer.key])
    );

  it("gives the deck's sentences on every card of a deck that has a template", () => {
    const explained = DECKS.filter(({ deck }) => deck.config.explain);
    // Six decks of Network+ and A+, and the six of Security+.
    expect(explained.length).toBeGreaterThanOrEqual(12);
    let cards = 0;
    for (const { cert, deck } of explained) {
      for (const item of itemsOf(deck)) {
        for (const { rep, cue } of cardsWithCue(deck, item)) {
          const at = `${cert}/${deck.config.id}: ${item}`;
          const rows = rowAsked(deck, item, rep, cue);
          expect(rows, at).toHaveLength(1);
          const sentences = explainRow(deck.config, rows[0]);
          expect(sentences, at).not.toBeNull();
          // Where the cue names another row too, the card also says which answer it asked for.
          const also = otherAnswersSentence(cue, rightAnswer(rep), otherAnswers(deck, cue, rightAnswer(rep)));
          expect(rep.takeaway, at).toBe([sentences, also].filter(Boolean).join(" "));
          cards++;
        }
      }
    }
    expect(cards).toBeGreaterThan(1100);
  });

  // The first questions a visitor answers on the Network+ and A+ pages. A card
  // that printed the bare term ("POP3S") left the question ("Which port?") to
  // a line that a screen reader does not read with the answers.
  describe("the six decks of the introductory questions", () => {
    const INTRODUCTORY = Object.keys(RECALL_QUESTIONS);
    const decks = DECKS.filter(({ deck }) => INTRODUCTORY.includes(deck.config.id));

    it("are the decks that the introductory questions of Network+ and both A+ cores draw on", () => {
      const drawn = (["network-plus-n10-009", "a-plus-core1-220-1201", "a-plus-core2-220-1202"] as const).flatMap((cert) =>
        (PATH_CONTENT[cert].warmup.decks ?? []).map(
          ({ tableId }) => getRecallDecks(cert).find((deck) => deck.config.tableId === tableId)!.config.id
        )
      );
      expect([...new Set(drawn)].sort()).toEqual([...INTRODUCTORY].sort());
      expect(decks).toHaveLength(6);
    });

    it("have one row for each item, so that a question names one fact", () => {
      for (const { cert, deck } of decks) {
        expect(itemsOf(deck), `${cert}/${deck.config.id}`).toHaveLength(deck.rows.length);
      }
    });

    it("ask every card as one sentence that names the term, with no line under it", () => {
      let cards = 0;
      for (const { cert, deck } of decks) {
        for (const item of itemsOf(deck)) {
          for (const { rep, cue } of cardsWithCue(deck, item)) {
            const at = `${cert}/${deck.config.id}: ${rep.prompt}`;
            expect(rep.prompt, at).toMatch(/^[A-Z][^?]* [^?]*\?$/);
            expect(rep.prompt, at).not.toMatch(/[;:]|\s\/\s|\s{2}/);
            // The term is in the sentence, as the table writes it, or (for a
            // pair of ports or a note) in the sentence of its own.
            const own = RECALL_QUESTIONS[deck.config.id].rows?.[cue];
            if (own) expect(rep.prompt, at).toBe(own);
            else expect(rep.prompt.toLowerCase(), at).toContain(cue.toLowerCase());
            if (rep.type === "choice") expect(rep.cue, at).toBeUndefined();
            cards++;
          }
        }
      }
      expect(cards).toBeGreaterThan(200);
    });

    it("ask the examples of the finding in its own words", () => {
      const net = getRecallDecks("network-plus-n10-009").find((deck) => deck.config.id === "net-ports")!;
      expect(recallToRep(net, "POP3S", "1.5", rngFrom(FORWARD), false).prompt).toBe("Which port or ports does POP3S use?");
      expect(recallToRep(net, "HTTPS", "1.5", rngFrom(BACK), false).prompt).toBe("Which protocol uses port 443?");
      expect(recallToRep(net, "DHCP", "1.5", rngFrom(BACK), false).prompt).toBe("Which protocol uses ports 67 and 68?");
      const osi = getRecallDecks("network-plus-n10-009").find((deck) => deck.config.id === "net-osi")!;
      expect(recallToRep(osi, "Presentation", "1.1", rngFrom(BACK), false).prompt).toBe("Which layer of the OSI model is layer 6?");
      const linux = getRecallDecks("a-plus-core2-220-1202").find((deck) => deck.config.id === "a2-linux")!;
      expect(recallToRep(linux, "List directory contents", "1.9", rngFrom(FORWARD), false).prompt).toBe(
        "Which Linux command is used to list directory contents?"
      );
    });

    // "Which ports does FTP use?" beside three single ports told the learner
    // that the answer was the one option with two ports in it. A protocol's
    // question is asked in the same words whatever its answer holds, and the
    // typed card's field asks for what its grader accepts: any one of the ports.
    it("ask for a protocol's ports in words that do not depend on how many ports the answer has", () => {
      for (const id of ["net-ports", "a1-ports"]) {
        const { deck } = decks.find(({ deck }) => deck.config.id === id)!;
        /** The question with its term taken out, by whether the answer is one port or several. */
        const wording = { one: new Set<string>(), several: new Set<string>() };
        const typedCues = new Set<string | undefined>();
        for (const item of itemsOf(deck)) {
          const forward = recallToRep(deck, item, "1.5", rngFrom(FORWARD), false);
          const typed = recallToRep(deck, item, "1.5", rngFrom(FORWARD), true);
          expect(forward.type, `${id}: ${item}`).toBe("choice");
          expect(typed.type, `${id}: ${item}`).toBe("typed");
          const ports = /[/,-]/.test(rightAnswer(forward)) ? "several" : "one";
          for (const rep of [forward, typed]) wording[ports].add(rep.prompt.replace(item, "{value}"));
          typedCues.add(typed.cue);
          // Any one port of the answer is a correct typed answer, as the field says.
          if (typed.type === "typed") {
            for (const port of rightAnswer(forward).split(/[/,-]/)) expect(typed.accept, `${id}: ${item}`).toContain(port);
          }
        }
        // Both kinds of answer are in the deck, so the comparison is not empty.
        expect(wording.one.size, id).toBeGreaterThan(0);
        expect(wording.several.size, id).toBeGreaterThan(0);
        expect([...wording.one], id).toEqual(["Which port or ports does {value} use?"]);
        expect([...wording.several], id).toEqual([...wording.one]);
        expect([...typedCues], id).toEqual(["Type a port number"]);
      }
    });

    // A question's id is made from the deck and the row, and never from its
    // words, so a stored answer still names the same question: the guard
    // "the ids and answers of every recall fact the study path draws on" below
    // holds every one of these decks' ids and answers to the list pinned at
    // the end of this file.

    it("leave every other deck as it was: the term, and a cue that asks for the answer", () => {
      const acronyms = getRecallDecks("security-plus-sy0-701").find((deck) => deck.config.id === "sec-acronyms")!;
      expect(recallToRep(acronyms, "MFA", "", rngFrom(FORWARD), false)).toMatchObject({ prompt: "MFA", cue: "Which expansion?" });
    });
  });

  it("explains the row that was asked when a cue stands for two rows", () => {
    const ports = getRecallDecks("security-plus-sy0-701").find((deck) => deck.config.id === "sec-ports")!;
    const legacy = "RADIUS uses ports 1645 and 1646. These are its legacy ports.";
    const current = "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting.";
    // What the card says where RADIUS is the cue, and where one of its pairs of ports is.
    const own = new Map<string, string>();
    const back = new Map<string, string>();
    // The second number decides which of the two rows is dealt.
    for (const second of [0.1, 0.9]) {
      for (const first of [FORWARD, BACK]) {
        for (const typed of [false, true]) {
          let n = 0;
          const rep = recallToRep(ports, "RADIUS", "1.1", () => (n++ === 0 ? first : second), typed);
          const [row] = rowAsked(ports, "RADIUS", rep);
          (rep.prompt === "RADIUS" ? own : back).set(row.port, rep.takeaway);
          // The verdict names the pair of ports that the sentences are about.
          if (typed || first === FORWARD) expect(verdicts(rep)[1]).toBe(`Incorrect. The correct answer is ${row.port}. ${rep.takeaway}`);
          else expect(rep.prompt).toBe(row.port);
        }
      }
    }
    // A pair of ports is one row's: the card says that row's sentences and no more.
    expect(Object.fromEntries(back)).toEqual({ "1645/1646": legacy, "1812/1813": current });
    // RADIUS names both rows: the card adds which answer it asked for, and the other one.
    expect(Object.fromEntries(own)).toEqual({
      "1645/1646": `${legacy} This question asked for 1645/1646. Another correct answer for RADIUS is 1812/1813.`,
      "1812/1813": `${current} This question asked for 1812/1813. Another correct answer for RADIUS is 1645/1646.`,
    });
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

/**
 * A recall fact's id is made from the objective that its deck teaches on the
 * study path, the deck and the fact's item (recallRepId), and the fact's
 * progress is stored under it. What the decks build today is compared with the
 * list pinned at the end of this file, so an edit that would retire the answers
 * given to a fact (a row's item, a deck's id, a table's objective) or that
 * would change a fact's answer fails here. Rewording a question
 * (src/data/recall/questions.ts) changes none of them.
 */
describe("the ids and answers of every recall fact the study path draws on", () => {
  /** The ids of an exam's facts, each with its answers in the table's order. */
  const factsOf = (lines: { objective: string; deck: string; item: string; answer: string }[]) => {
    const facts = new Map<string, string[]>();
    for (const { objective, deck, item, answer } of lines) {
      const id = recallRepId(objective, deck, item);
      facts.set(id, [...(facts.get(id) ?? []), answer]);
    }
    return facts;
  };
  const pinnedLines = (manifest: string) =>
    manifest
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [objective, deck, item, answer] = line.split("|");
        return { objective, deck, item, answer };
      });
  /** Every row of every deck that the exam's study path draws on, as the tree has it now. */
  const currentLines = (cert: PathCert) => {
    const content = PATH_CONTENT[cert];
    const tables = [...new Set([...Object.keys(content.recallTables), ...(content.warmup.decks ?? []).map((d) => d.tableId)])];
    return tables.flatMap((tableId) => {
      const deck = getRecallDecks(cert).find((d) => d.config.tableId === tableId);
      expect(deck, `${cert}: no deck for ${tableId}`).toBeDefined();
      const objective = content.recallTables[tableId] ?? "";
      return deck!.rows.map((row) => ({
        objective,
        deck: deck!.config.id,
        item: row[deck!.config.ask.key],
        answer: row[deck!.config.answer.key],
      }));
    });
  };

  it("pins every exam whose study path draws on a recall deck, and no other", () => {
    const drawing = (Object.keys(PATH_CONTENT) as PathCert[]).filter((cert) => currentLines(cert).length > 0);
    expect(Object.keys(recallIdsAndAnswers()).sort()).toEqual(drawing.sort());
  });

  for (const [cert, manifest] of Object.entries(recallIdsAndAnswers())) {
    it(`${cert}: keeps every fact's id and answer`, () => {
      const pinned = factsOf(pinnedLines(manifest));
      const now = factsOf(currentLines(cert as PathCert));
      expect([...now.keys()].sort()).toEqual([...pinned.keys()].sort());
      for (const [id, answers] of pinned) expect([...(now.get(id) ?? [])].sort(), id).toEqual([...answers].sort());
    });

    it(`${cert}: deals every pinned fact under its id, with its answer, whichever way it is asked`, () => {
      const answersOf = factsOf(pinnedLines(manifest));
      let cards = 0;
      for (const { objective, deck: deckId, item, answer } of pinnedLines(manifest)) {
        const deck = getRecallDecks(cert).find((d) => d.config.id === deckId);
        expect(deck, `${cert}: no deck ${deckId}`).toBeDefined();
        const id = recallRepId(objective, deckId, item);
        const answers = answersOf.get(id)!;
        const at = `${cert}/${deckId}: ${item}`;
        const forward = recallToRep(deck!, item, objective, rngFrom(FORWARD), false);
        expect(forward.id, at).toBe(id);
        expect(answers, at).toContain(rightAnswer(forward));
        if (deck!.config.bidirectional) {
          // Asked the other way round, the answer is the item, and the cue is its answer cell.
          const back = recallToRep(deck!, item, objective, rngFrom(BACK), false);
          expect(back.id, at).toBe(id);
          expect(rightAnswer(back), at).toBe(item);
        }
        if (deck!.typeable) {
          const typed = recallToRep(deck!, item, objective, rngFrom(BACK), true);
          expect(typed.id, at).toBe(id);
          expect(answers, at).toContain(rightAnswer(typed));
        }
        expect(answers, at).toContain(answer);
        cards++;
      }
      expect(cards).toBeGreaterThan(80);
    });
  }
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

/**
 * Every recall fact that the study path can ask, as it stood at commit 9d9489d
 * on 23 November 2026: one line for each row of each deck that an exam's study
 * path draws on (its recall tables and its introductory questions' decks),
 * "objective|deck|item|answer". A fact's id (r|objective|deck|hash of the item,
 * built by recallRepId) is the key its progress is stored under, so an edit to
 * a row's item, a deck's id or a table's objective would retire every answer
 * given to that fact. A new fact is added to this list in the change that
 * writes it.
 */
function recallIdsAndAnswers(): Record<string, string> {
  return {
    "network-plus-n10-009": `
1.1|net-osi|Application|7
1.1|net-osi|Presentation|6
1.1|net-osi|Session|5
1.1|net-osi|Transport|4
1.1|net-osi|Network|3
1.1|net-osi|Data Link|2
1.1|net-osi|Physical|1
1.3|net-cables|Cat 5e|1 Gbps
1.3|net-cables|Cat 6|10 Gbps
1.3|net-cables|Cat 6a|10 Gbps
1.3|net-cables|Cat 7|10 Gbps
1.3|net-cables|Cat 8|40 Gbps
1.3|net-cables|Single-mode fiber|100+ Gbps
1.3|net-cables|Multimode fiber|100 Gbps
1.3|net-cables|Coaxial RG-6|~1 Gbps (DOCSIS 3.1)
1.3|net-cables|Direct Attach Copper|10–100 Gbps
1.4|auto-subnetting-chart|255.0.0.0|/8
1.4|auto-subnetting-chart|255.128.0.0|/9
1.4|auto-subnetting-chart|255.192.0.0|/10
1.4|auto-subnetting-chart|255.224.0.0|/11
1.4|auto-subnetting-chart|255.240.0.0|/12
1.4|auto-subnetting-chart|255.248.0.0|/13
1.4|auto-subnetting-chart|255.252.0.0|/14
1.4|auto-subnetting-chart|255.254.0.0|/15
1.4|auto-subnetting-chart|255.255.0.0|/16
1.4|auto-subnetting-chart|255.255.128.0|/17
1.4|auto-subnetting-chart|255.255.192.0|/18
1.4|auto-subnetting-chart|255.255.224.0|/19
1.4|auto-subnetting-chart|255.255.240.0|/20
1.4|auto-subnetting-chart|255.255.248.0|/21
1.4|auto-subnetting-chart|255.255.252.0|/22
1.4|auto-subnetting-chart|255.255.254.0|/23
1.4|auto-subnetting-chart|255.255.255.0|/24
1.4|auto-subnetting-chart|255.255.255.128|/25
1.4|auto-subnetting-chart|255.255.255.192|/26
1.4|auto-subnetting-chart|255.255.255.224|/27
1.4|auto-subnetting-chart|255.255.255.240|/28
1.4|auto-subnetting-chart|255.255.255.248|/29
1.4|auto-subnetting-chart|255.255.255.252|/30
1.5|net-ports|FTP|20/21
1.5|net-ports|SSH|22
1.5|net-ports|Telnet|23
1.5|net-ports|SMTP|25
1.5|net-ports|DNS|53
1.5|net-ports|DHCP|67/68
1.5|net-ports|TFTP|69
1.5|net-ports|HTTP|80
1.5|net-ports|POP3|110
1.5|net-ports|NTP|123
1.5|net-ports|IMAP|143
1.5|net-ports|SNMP|161/162
1.5|net-ports|LDAP|389
1.5|net-ports|HTTPS|443
1.5|net-ports|SMB|445
1.5|net-ports|Syslog|514
1.5|net-ports|SMTP (STARTTLS)|587
1.5|net-ports|LDAPS|636
1.5|net-ports|IMAPS|993
1.5|net-ports|POP3S|995
1.5|net-ports|MS-SQL|1433
1.5|net-ports|Oracle SQL|1521
1.5|net-ports|MySQL|3306
1.5|net-ports|RDP|3389
1.5|net-ports|SIP|5060/5061
1.5|net-ports|HTTP Alt|8080
1.6|net-commands|Display IP address, subnet mask, default gateway, and DNS for Windows adapters|ipconfig
1.6|net-commands|Display or configure network interfaces on Unix/Linux (deprecated in favor of ip)|ifconfig
1.6|net-commands|Modern Linux command for IP addressing, routing, and link management|ip
1.6|net-commands|Send ICMP echo requests to test reachability and measure round-trip time|ping
1.6|net-commands|Trace route to destination, revealing each hop: uses ICMP TTL-exceeded on Windows|tracert
1.6|net-commands|Trace route to destination: uses UDP probes by default on Linux/macOS|traceroute
1.6|net-commands|Combines ping and tracert: shows per-hop packet loss statistics over time|pathping
1.6|net-commands|Continuous real-time traceroute with per-hop loss and latency: combines ping + traceroute|mtr
1.6|net-commands|Query DNS servers for name-to-IP resolution and reverse lookups|nslookup
1.6|net-commands|Detailed DNS query tool: shows full DNS response including TTL and record type|dig
1.6|net-commands|Display active TCP/UDP connections, listening ports, and routing table|netstat
1.6|net-commands|Network scanner: discover hosts, open ports, OS fingerprinting, and service versions|nmap
1.6|net-commands|Display or modify the ARP cache mapping IP addresses to MAC addresses|arp
1.6|net-commands|Display or modify the IP routing table on a host|route
1.6|net-commands|Capture and analyze raw network packets on a live interface|tcpdump
1.6|net-commands|Measure maximum achievable TCP/UDP bandwidth between two endpoints|iperf
1.6|net-commands|TCP/UDP Swiss-army knife: port scanning, banner grabbing, data transfer|netcat
1.6|net-commands|Display or set the hostname of the local machine|hostname
1.6|net-commands|Display interface status, errors (CRC, runts, giants), duplex, and speed on Cisco IOS|show interface
1.6|net-commands|Display the active (running) configuration stored in RAM on Cisco IOS devices|show running-config
1.6|net-commands|Display the IP routing table including static, connected, and dynamic routes|show ip route
2.2|net-routing|Static Route|1
2.2|net-routing|Default Route|1
2.2|net-routing|RIPv2|120
2.2|net-routing|OSPF|110
2.2|net-routing|EIGRP|90 (internal) / 170 (external)
2.2|net-routing|BGP|20 (eBGP) / 200 (iBGP)
2.2|net-routing|IS-IS|115
2.4|net-wireless|802.11a|5 GHz
2.4|net-wireless|802.11b|2.4 GHz
2.4|net-wireless|802.11g|2.4 GHz
2.4|net-wireless|802.11n|2.4 GHz / 5 GHz
2.4|net-wireless|802.11ac|5 GHz
2.4|net-wireless|802.11ax|2.4 / 5 / 6 GHz (6E adds 6 GHz)
`,
    "a-plus-core1-220-1201": `
2.1|a1-ports|FTP|20/21
2.1|a1-ports|SSH|22
2.1|a1-ports|Telnet|23
2.1|a1-ports|SMTP|25
2.1|a1-ports|DNS|53
2.1|a1-ports|DHCP|67/68
2.1|a1-ports|HTTP|80
2.1|a1-ports|POP3|110
2.1|a1-ports|NetBIOS/NetBT|137-139
2.1|a1-ports|IMAP|143
2.1|a1-ports|LDAP|389
2.1|a1-ports|HTTPS|443
2.1|a1-ports|SMB|445
2.1|a1-ports|RDP|3389
2.2|a1-wireless|802.11a|54 Mbps
2.2|a1-wireless|802.11b|11 Mbps
2.2|a1-wireless|802.11g|54 Mbps
2.2|a1-wireless|802.11n|600 Mbps
2.2|a1-wireless|802.11ac|6.9 Gbps
2.2|a1-wireless|802.11ax|9.6 Gbps
2.2|a1-wireless|Bluetooth 4.0|1 Mbps
2.2|a1-wireless|Bluetooth 4.2|1 Mbps
2.2|a1-wireless|Bluetooth 5.0|2 Mbps
2.2|a1-wireless|Bluetooth 5.3|2 Mbps
2.2|a1-wireless|NFC|424 Kbps
2.2|a1-wireless|RFID (LF)|~1 Kbps
2.2|a1-wireless|RFID (HF)|~26 Kbps
2.2|a1-wireless|RFID (UHF)|~140 Kbps
2.2|a1-wireless|3G (HSPA+)|~42 Mbps
2.2|a1-wireless|4G LTE|~150 Mbps
2.2|a1-wireless|5G|Up to 20 Gbps (mmWave)
3.2|a1-cables|Cat 5e|1 Gbps
3.2|a1-cables|Cat 6|10 Gbps
3.2|a1-cables|Cat 6a|10 Gbps
3.2|a1-cables|Single-mode fiber (SMF)|100+ Gbps
3.2|a1-cables|Multimode fiber (MMF)|10 Gbps
3.2|a1-cables|USB 2.0|480 Mbps
3.2|a1-cables|USB 3.0 (3.2 Gen 1)|5 Gbps
3.2|a1-cables|USB 3.1 (3.2 Gen 2)|10 Gbps
3.2|a1-cables|USB Type-C|Up to 40 Gbps (TB4)
3.2|a1-cables|Thunderbolt 3|40 Gbps
3.2|a1-cables|Thunderbolt 4|40 Gbps
3.2|a1-cables|Lightning|480 Mbps (USB 2.0 speed)
3.2|a1-cables|HDMI 1.4|10.2 Gbps
3.2|a1-cables|HDMI 2.0|18 Gbps
3.2|a1-cables|HDMI 2.1|48 Gbps
3.2|a1-cables|DisplayPort 1.2|21.6 Gbps
3.2|a1-cables|DisplayPort 1.4|32.4 Gbps
3.2|a1-cables|DVI-D|~9.9 Gbps
3.2|a1-cables|DVI-I|~9.9 Gbps
3.2|a1-cables|SATA III|6 Gbps
3.2|a1-cables|eSATA|6 Gbps
3.2|a1-cables|Serial (RS-232)|115.2 Kbps
3.4|a1-storage|HDD (3.5")|~200 MB/s
3.4|a1-storage|HDD (2.5")|~150 MB/s
3.4|a1-storage|SSD (SATA)|~550 MB/s
3.4|a1-storage|SSD (mSATA)|~550 MB/s
3.4|a1-storage|SSD (NVMe M.2)|3,500 MB/s (Gen3) / 7,000 MB/s (Gen4)
3.4|a1-storage|SSD (NVMe PCIe add-in)|7,000+ MB/s
3.4|a1-storage|CD-ROM / CD-RW|52× (~7.8 MB/s)
3.4|a1-storage|DVD-ROM / DVD-RW|16× (~22 MB/s)
3.4|a1-storage|Blu-ray (BD-ROM / BD-R)|16× (~72 MB/s)
3.4|a1-storage|USB Flash Drive|Up to 400 MB/s (USB 3.0)
3.4|a1-storage|SD Card|Up to 985 MB/s (UHS-II)
3.4|a1-storage|microSD Card|Up to 985 MB/s (UHS-II)
3.5|auto-motherboard-components|Full-size motherboard: most desktop systems|ATX
3.5|auto-motherboard-components|Smaller desktop form factor, fewer expansion slots|Micro-ATX (mATX)
3.5|auto-motherboard-components|Very compact form factor for HTPCs and small builds|Mini-ITX
3.5|auto-motherboard-components|Intel socket: 12th/13th/14th gen (Alder/Raptor Lake)|LGA 1700
3.5|auto-motherboard-components|Intel socket: 10th/11th gen (Comet/Rocket Lake)|LGA 1200
3.5|auto-motherboard-components|AMD socket: Ryzen 1000–5000 series|AM4
3.5|auto-motherboard-components|AMD socket: Ryzen 7000 series and beyond|AM5
3.5|auto-motherboard-components|Dual Inline Memory Module: desktop RAM|DIMM
3.5|auto-motherboard-components|Small Outline DIMM: laptop/compact RAM|SO-DIMM
3.5|auto-motherboard-components|Primary GPU slot: 16 lanes of PCIe bandwidth|PCIe x16
3.5|auto-motherboard-components|Mid-size slot: NVMe adapters, controllers|PCIe x4
3.5|auto-motherboard-components|Small slot: sound cards, NICs, riser cards|PCIe x1
3.5|auto-motherboard-components|Compact slot for NVMe SSDs and SATA SSDs|M.2 slot
3.5|auto-motherboard-components|On-board SATA III connectors for drives and optical|SATA ports
3.5|auto-motherboard-components|Main motherboard power connector from PSU|24-pin ATX power
3.5|auto-motherboard-components|Dedicated +12V power for CPU VRM|8-pin CPU power (EPS12V)
3.5|auto-motherboard-components|Supplemental power for discrete GPUs|6/8-pin PCIe power
3.5|auto-motherboard-components|Power SW, Reset SW, HDD LED, Power LED pins|Front panel connectors
3.5|auto-motherboard-components|Internal USB 2.0 (9-pin) and USB 3.0 (19-pin) headers|USB headers
3.5|auto-motherboard-components|Firmware interface for hardware initialization and boot config|BIOS/UEFI
3.5|auto-motherboard-components|CR2032 coin cell: powers RTC and BIOS settings|CMOS battery
3.8|auto-printer-types|Electrophotographic process: drum charged by corona/transfer roller, laser writes image, toner attracted to drum, fused to paper by heat|Laser (mono)
3.8|auto-printer-types|Same as mono laser but uses 4 separate toner cartridges (CMYK) and a transfer belt to layer colors|Laser (color)
3.8|auto-printer-types|Propels droplets of liquid ink onto paper; thermal (heat bubble) or piezoelectric methods; high DPI for photo-quality output|Inkjet
3.8|auto-printer-types|Heat-sensitive paper darkens when thermal printhead applies heat; no ink, toner, or ribbon required|Thermal (direct)
3.8|auto-printer-types|Print head with pins strikes an inked ribbon against paper; forms characters from dot patterns|Impact / Dot-matrix
`,
    "a-plus-core2-220-1202": `
1.5|a2-windows|Change the current directory|cd
1.5|a2-windows|List the files and folders in a directory|dir
1.5|a2-windows|Display IP configuration for all adapters|ipconfig
1.5|a2-windows|Test connectivity to a host by sending ICMP echo requests|ping
1.5|a2-windows|Trace the route packets take to a destination; shows each hop|tracert
1.5|a2-windows|Combines ping and tracert; shows packet loss at each hop over time|pathping
1.5|a2-windows|Display active TCP connections, listening ports, and statistics|netstat
1.5|a2-windows|Query DNS servers to resolve hostnames and IP addresses|nslookup
1.5|a2-windows|Map, display, or disconnect network drives and shared resources|net use
1.5|a2-windows|Check disk for file system errors and bad sectors|chkdsk
1.5|a2-windows|Format a disk or partition with a specified file system|format
1.5|a2-windows|Manage disks, partitions, and volumes interactively|diskpart
1.5|a2-windows|Create a new directory|md
1.5|a2-windows|Remove a directory (must be empty, or use /s)|rmdir
1.5|a2-windows|Robust file copy: resumes failed transfers, mirrors directories|robocopy
1.5|a2-windows|Display the current computer's hostname|hostname
1.5|a2-windows|Manage local user accounts: create, modify, delete, view|net user
1.5|a2-windows|Show the Windows version and build number|winver
1.5|a2-windows|Show which user account you are signed in as|whoami
1.5|a2-windows|Show a command's help (syntax and switches), typed after the command's name|/?
1.5|a2-windows|Refresh Group Policy settings immediately|gpupdate
1.5|a2-windows|Display the Resultant Set of Policy (RSoP) applied to the computer/user|gpresult
1.5|a2-windows|System File Checker: scan and repair corrupted Windows system files|sfc
1.4|a2-tools|Monitor processes, performance, startup apps, and users|Task Manager
1.4|a2-tools|View and manage hardware devices and drivers|Device Manager
1.4|a2-tools|Create, format, resize, and manage disk partitions and volumes|Disk Management
1.4|a2-tools|View system, application, and security event logs|Event Viewer
1.4|a2-tools|Start, stop, configure, and set startup type for Windows services|Services
1.4|a2-tools|Manage boot options, startup items, and services for troubleshooting|System Configuration (msconfig)
1.4|a2-tools|View and modify the Windows registry: system and application settings|Registry Editor
1.4|a2-tools|Create and manage automated tasks triggered by time or events|Task Scheduler
1.4|a2-tools|Host snap-ins for custom admin consoles|Microsoft Management Console (MMC)
1.4|a2-tools|All-in-one console: Device Manager, Disk Management, Event Viewer, Services, and more|Computer Management
1.4|a2-tools|Track real-time and historical system performance counters|Performance Monitor
1.4|a2-tools|Detailed real-time view of CPU, memory, disk, and network usage per process|Resource Monitor
1.4|a2-tools|Display detailed hardware and software inventory for the system|System Information
1.4|a2-tools|Configure local Group Policy settings for security and system behavior|Group Policy Editor
1.4|a2-tools|Create and manage local user accounts and group memberships|Local Users and Groups
1.4|a2-tools|Free space by deleting temporary and unneeded files|Disk Cleanup
1.4|a2-tools|Optimize drives: defragment hard drives, TRIM solid-state drives|Disk Defragment
1.4|a2-tools|View and manage digital certificates for the user or computer|Certificate Manager
1.9|a2-linux|List directory contents|ls
1.9|a2-linux|Print current working directory (full path)|pwd
1.9|a2-linux|Move or rename files and directories|mv
1.9|a2-linux|Copy files or directories|cp
1.9|a2-linux|Remove files or directories|rm
1.9|a2-linux|Change file or directory permissions (read/write/execute)|chmod
1.9|a2-linux|Change file owner and group|chown
1.9|a2-linux|Search text using patterns (regular expressions)|grep
1.9|a2-linux|Search for files and directories by name, type, size, or date|find
1.9|a2-linux|Check and repair a Linux file system|fsck
1.9|a2-linux|Attach a drive, partition or share to a directory|mount
1.9|a2-linux|Switch to another user account|su
1.9|a2-linux|Execute a command as another user (typically root)|sudo
1.9|a2-linux|Debian/Ubuntu package manager: install, update, remove packages|apt
1.9|a2-linux|Red Hat/Fedora package manager: install, update, remove packages|dnf
1.9|a2-linux|Show and configure network interfaces, addresses and routes|ip
1.9|a2-linux|Test network connectivity to a host via ICMP echo|ping
1.9|a2-linux|Transfer data to or from a URL: download files, test web services|curl
1.9|a2-linux|Query DNS servers for a name's records|dig
1.9|a2-linux|Show each router hop on the path to a host|traceroute
1.9|a2-linux|Display the manual page for any command|man
1.9|a2-linux|Display file contents or concatenate files|cat
1.9|a2-linux|Real-time interactive process viewer: updates every few seconds|top
1.9|a2-linux|Display currently running processes|ps
1.9|a2-linux|Estimate file and directory disk usage|du
1.9|a2-linux|Report file system disk space usage|df
1.9|a2-linux|Simple terminal text editor: beginner friendly|nano
2.1|a2-security|Knowledge-based authentication: the weakest factor alone|Something you know
2.1|a2-security|Possession-based authentication: physical or virtual token|Something you have
2.1|a2-security|Biometric authentication: inherence factor|Something you are
2.1|a2-security|Time-based One-Time Password: 6-digit code that rotates every 30 seconds|TOTP
2.1|a2-security|Full-disk encryption built into Windows Pro/Enterprise; uses AES-128 or AES-256|BitLocker
2.1|a2-security|Encrypting File System: file/folder level encryption tied to user account|EFS
2.1|a2-security|Apple's full-disk encryption for macOS; uses XTS-AES-128|FileVault
2.1|a2-security|Trusted Platform Module: dedicated security chip that stores cryptographic keys|TPM
2.1|a2-security|Self-replicating code that attaches to legitimate files/programs and requires a host to spread|Virus
2.1|a2-security|Malware disguised as legitimate software; does not self-replicate but opens a backdoor|Trojan
2.1|a2-security|Hides its presence and other malware by modifying OS internals; operates at kernel or firmware level|Rootkit
2.1|a2-security|Encrypts victim's files and demands payment for decryption key|Ransomware
2.1|a2-security|Secretly monitors user activity and sends data to attacker without consent|Spyware
2.1|a2-security|Records every keystroke to capture passwords, credit card numbers, and PII|Keylogger
2.1|a2-security|Self-replicating malware that spreads across networks without needing a host file|Worm
2.1|a2-security|Uses victim's CPU/GPU resources to mine cryptocurrency for the attacker|Cryptominer
2.1|a2-security|Infected device (zombie) under remote attacker control, used in coordinated attacks|Botnet / Bot
2.1|a2-security|Fraudulent emails designed to trick users into revealing credentials or clicking malicious links|Phishing
2.1|a2-security|Voice phishing: phone calls impersonating IT support, banks, or government agencies|Vishing
2.1|a2-security|SMS phishing: malicious text messages with links or requests for information|Smishing
2.1|a2-security|Observing a person's screen or keyboard to steal credentials or PINs|Shoulder surfing
2.1|a2-security|Following an authorized person through a secure door without using own credentials|Tailgating / Piggybacking
2.1|a2-security|Searching discarded documents and hardware for sensitive information|Dumpster diving
2.1|a2-security|Rogue wireless access point with the same SSID as a legitimate network to intercept traffic|Evil twin
2.1|a2-security|Prompts for admin approval before allowing changes that affect the system; limits privilege escalation|UAC (User Account Control)
2.1|a2-security|Built-in host-based firewall that filters inbound and outbound traffic by rule|Windows Defender Firewall
2.1|a2-security|Detects and removes known malware using signature databases and heuristics|Antivirus (AV)
2.1|a2-security|Advanced security platform that monitors endpoint behavior and responds to threats automatically|EDR (Endpoint Detection & Response)
2.6|a2-malware|Investigate and verify malware symptoms|1
2.6|a2-malware|Quarantine the infected system|2
2.6|a2-malware|Disable System Restore in Windows|3
2.6|a2-malware|Remediate the infected system|4
2.6|a2-malware|Schedule scans and run updates|5
2.6|a2-malware|Enable System Restore and create a restore point|6
2.6|a2-malware|Educate the end user|7
`,
  };
}
