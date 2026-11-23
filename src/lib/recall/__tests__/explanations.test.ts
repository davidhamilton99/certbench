import { describe, expect, it } from "vitest";
import { wordCount } from "@/core/path/text";
import { PATH_CONTENT } from "@/data/path";
import { getRecallDecks } from "@/data/recall";
import { referenceRegistry } from "@/data/reference";
import { explainRow, type ResolvedDeck } from "../recall-deck";

/**
 * A recall deck that has an explanation template (`explain` in its
 * configuration) explains every answer in sentences. The question card prints
 * the explanation straight after its verdict, "Correct." or "Incorrect. The
 * correct answer is 22.", so it has to read on from either one as one or two
 * complete sentences in the register of the page around it.
 *
 * Before the templates, these explanations were notes assembled from the
 * reference tables: "IMAP: 143 (Internet Message Access Protocol: sync
 * email)", "67/68: DHCP (Dynamic Host Configuration Protocol (server/client))",
 * "Cat 6: 10 Gbps (55 m (10G) / 100 m (1G))", "format: CMD", "dig: dig [name]
 * [type]". They are the first explanations a visitor to the Network+ and A+
 * study paths reads, because those exams' introductory questions are drawn
 * from these decks.
 *
 * Every row of every deck that has a template is held to the rule here, so a
 * row added to a table later is held to it too. The written introductory
 * questions of the two Security+ exams are held to the same rule in
 * src/data/path/__tests__/introductory-explanations.test.ts.
 */

/** As for the written introductory questions: the verdict and its explanation stay a few lines on a phone. */
const MAX_WORDS = 22;

/** "is not" and "it is" closed up. A possessive ("a command's name") is not a contraction. */
const CONTRACTION =
  /\b(?:[A-Za-z]+n't|(?:[Ii]t|[Tt]hat|[Tt]here|[Hh]ere|[Ww]hat|[Ww]ho|[Hh]e|[Ss]he|[Ll]et)'s|[A-Za-z]+'(?:re|ve|ll|d|m))\b/;

/** A first word that needs something before it. After "Correct." there is nothing before it. */
const LEANS_ON_THE_VERDICT = /^(?:It|Its|This|That|These|Those|They|Their|Because|So|And|But|Or|Which|Also)\b/;

/** A figure that stands by itself: "55" and "0.5", but not the 3 of "OM3" or of "POP3". */
const FIGURE = /(?<![A-Za-z0-9.])\d+(?:\.\d+)?/g;
const figuresOf = (text: string): string[] => text.match(FIGURE) ?? [];

/** The columns a template speaks of: "{protocol} uses port {port}." speaks of the protocol and the port. */
const placesOf = (template: string) => [...template.matchAll(/\{(\w+)(?::\w+)?\}/g)].map((place) => place[1]);

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether a text names a cell: the cell as written, or every word and figure
 * of it where the cell itself is a note. "ports 67 and 68" names "67/68", and
 * "up to 40 Gbps with Thunderbolt 4 (TB4)" names "Up to 40 Gbps (TB4)".
 */
function names(text: string, cell: string): boolean {
  if (text.toLowerCase().includes(cell.toLowerCase())) return true;
  const words = cell.match(/[A-Za-z0-9]+(?:\.\d+)?/g) ?? [];
  return (
    words.length > 0 &&
    words.every((word) => new RegExp(`(?<![A-Za-z0-9.])${escaped(word)}(?![A-Za-z0-9]|\\.\\d)`, "i").test(text))
  );
}

/** One row and what its explanation has to carry. */
interface Subject {
  row: Record<string, string>;
  /** The columns that can be the answer: both columns of a deck that asks both ways. */
  answers: string[];
  /** The columns the deck's template speaks of. */
  told: string[];
}

/** What is wrong with a row's explanation, in words; nothing when it is sound. */
function faults(text: string, { row, answers, told }: Subject): string[] {
  const found: string[] = [];
  const cells = Object.values(row);

  if (text !== text.trim() || /\s{2,}/.test(text)) found.push("has stray spacing");
  // Plain characters only: no dash, arrow, middle dot, curly quote or emoji.
  if ([...text].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)) {
    found.push("uses a character outside plain text");
  }
  // A colon or an equals sign is how a note joins a label to a fragment; a sentence uses a verb.
  if (/[:=]/.test(text)) found.push("joins a label to a fragment where a sentence belongs");
  if (/[[\]{}<>]/.test(text)) found.push("carries notation, or a place that was not filled");
  if (/~|\d\+/.test(text)) found.push("uses a note's shorthand for a figure");
  if (/\d\s*[/-]\s*\d/.test(text)) found.push("joins figures with a slash or a hyphen");
  if (CONTRACTION.test(text)) found.push("uses a contraction");

  // A name is kept as the exam writes it: "NetBIOS/NetBT", "Basic Input/Output System", "ATT&CK".
  const word = (raw: string) => raw.replace(/^\(+|[).,;]+$/g, "");
  const inItsOwnName = (token: string) => answers.some((key) => row[key].includes(token));
  // An ampersand stands inside such a name, never between two words in place of "and".
  const ampersands = (text.match(/\S*&\S*/g) ?? []).map(word);
  if (/!/.test(text) || ampersands.some((token) => !/[A-Za-z0-9]&[A-Za-z0-9]/.test(token) || !inItsOwnName(token))) {
    found.push("uses an exclamation mark or an ampersand");
  }
  // A slash belongs to a name the row itself writes with one ("SSL/TLS",
  // "NetBIOS/NetBT") or opens a switch ("/s"). It does not join two words.
  for (const token of (text.match(/\S*\/\S*/g) ?? []).map(word)) {
    const isName = /^(?:[A-Z0-9]+\/)+[A-Z0-9]+$/.test(token) || inItsOwnName(token);
    const isSwitch = /^\/[\w?]+$/.test(token);
    if (!(isName || isSwitch) || !cells.some((cell) => cell.includes(token))) {
      found.push(`joins words with a slash: "${token}"`);
    }
  }

  // A parenthesis holds a name, a code or an abbreviation that the row gives
  // ("(TB4)", "(CIFS)", "(3.2 Gen 1)"). A note's aside ("(insecure)",
  // "(server/client)", "(passive)") is said in words.
  if ((text.match(/\(/g) ?? []).length !== (text.match(/\)/g) ?? []).length || /\([^()]*\(/.test(text)) {
    found.push("has a parenthesis inside another, or one left open");
  }
  for (const group of text.match(/\([^()]*\)/g) ?? []) {
    const inside = group.slice(1, -1);
    if (!/[A-Z0-9]/.test(inside) || /[/,:]/.test(inside) || !cells.some((cell) => cell.includes(group))) {
      found.push(`has a parenthesis that is not a name or an abbreviation from its row: "${group}"`);
    }
  }

  const sentences = text.split(/(?<=\.)\s+/);
  if (sentences.length > 2) found.push(`has ${sentences.length} sentences`);
  for (const sentence of sentences) {
    if (!/^[A-Z]/.test(sentence) || !/[A-Za-z0-9)]\.$/.test(sentence)) {
      found.push(`is not set as a sentence: "${sentence}"`);
    }
    if (wordCount(sentence) < 4) found.push(`has a note where a sentence belongs: "${sentence}"`);
  }
  if (LEANS_ON_THE_VERDICT.test(text)) found.push("opens with a word that needs a sentence before it");
  if (wordCount(text) > MAX_WORDS) found.push(`runs to ${wordCount(text)} words`);

  // The verdict names the answer; the explanation is about that answer.
  for (const key of answers) {
    if (!names(text, row[key])) found.push(`does not name the ${key}, "${row[key]}"`);
  }
  // A figure in a cell the explanation speaks of is a fact of the row: a port, a speed, a distance.
  for (const key of told) {
    const said = figuresOf(text);
    const missing = figuresOf(row[key] ?? "").filter((figure) => !said.includes(figure));
    if (missing.length > 0) found.push(`does not carry ${missing.join(" and ")} from the ${key}, "${row[key]}"`);
  }
  return found;
}

const CERTS = Object.keys(referenceRegistry);

/** Every deck that explains its answers in sentences, with the reference table it drills. */
const EXPLAINED = CERTS.flatMap((cert) =>
  getRecallDecks(cert)
    .filter((deck) => deck.config.explain)
    .map((deck) => ({
      cert,
      deck,
      table: referenceRegistry[cert].find((table) => table.id === deck.config.tableId)!,
    }))
);

const subjectOf = (deck: ResolvedDeck, row: Record<string, string>): Subject => ({
  row,
  answers: deck.config.bidirectional ? [deck.config.answer.key, deck.config.ask.key] : [deck.config.answer.key],
  told: placesOf(deck.config.explain!.template),
});

describe("explanations of recall facts", () => {
  it("covers the six decks that the Network+ and A+ introductory questions draw on", () => {
    expect(EXPLAINED.map(({ deck }) => deck.config.id).sort()).toEqual(
      expect.arrayContaining(["a1-cables", "a1-ports", "a2-linux", "a2-windows", "net-osi", "net-ports"])
    );
    // 26 ports and 7 layers, 14 ports and 22 cables, 23 Windows and 27 Linux commands.
    expect(EXPLAINED.reduce((rows, { deck }) => rows + deck.rows.length, 0)).toBeGreaterThanOrEqual(119);
  });

  it("gives a template to every deck that an exam's introductory questions draw on", () => {
    let drawn = 0;
    for (const [cert, content] of Object.entries(PATH_CONTENT)) {
      for (const { tableId } of content.warmup.decks ?? []) {
        const deck = getRecallDecks(cert).find((d) => d.config.tableId === tableId);
        expect(deck?.config.explain, `${cert}: the deck for ${tableId}`).toBeDefined();
        drawn++;
      }
    }
    // Two decks for each of Network+, A+ Core 1 and A+ Core 2 today.
    expect(drawn).toBeGreaterThanOrEqual(6);
  });

  for (const { cert, deck, table } of EXPLAINED) {
    const explain = deck.config.explain!;
    const columns = new Set(table.columnHeaders.map((column) => column.key));
    const by = explain.by ?? deck.config.ask.key;

    describe(`${cert}: ${deck.config.id}`, () => {
      it("explains every row in one or two complete sentences", () => {
        for (const row of deck.rows) {
          const text = explainRow(deck.config, row);
          expect(text, `${row[by]}: a place in its sentence has no cell to fill it`).not.toBeNull();
          expect(faults(text!, subjectOf(deck, row)), `${row[by]}: ${text}`).toEqual([]);
        }
      });

      it("fills its sentences from columns its table has", () => {
        expect(columns.has(by), `the column "${by}" that names a row`).toBe(true);
        for (const [name, sentences] of [["the template", explain.template], ...Object.entries(explain.rows ?? {})]) {
          for (const place of placesOf(sentences)) {
            expect(columns.has(place), `${name}: {${place}}`).toBe(true);
          }
          // Whatever stands in braces is a place the filling knows.
          expect(sentences.replace(/\{\w+(?::lowerFirst)?\}/g, ""), name).not.toMatch(/[{}]/);
        }
      });

      it("writes a row's own sentences only for a row the deck asks", () => {
        const asked = new Set(deck.rows.map((row) => row[by]));
        for (const name of Object.keys(explain.rows ?? {})) {
          expect(asked.has(name), `"${name}" names no row of ${table.id} that this deck asks`).toBe(true);
        }
      });
    });
  }

  describe("the check itself", () => {
    const port = (protocol: string, number: string, service: string): Subject => ({
      row: { protocol, port: number, service },
      answers: ["port", "protocol"],
      told: ["protocol", "port"],
    });
    const imap = port("IMAP", "143", "Internet Message Access Protocol: sync email");
    const dhcp = port("DHCP", "67/68", "Dynamic Host Configuration Protocol (server/client)");
    const netbios = port("NetBIOS/NetBT", "137-139", "NetBIOS over TCP/IP: name, datagram and session services");
    const telnet = port("Telnet", "23", "Unencrypted remote terminal access (insecure)");
    const smb = port("SMB", "445", "Server Message Block (CIFS): Windows file and printer sharing");
    const cable = (name: string, maxSpeed: string, maxDistance: string): Subject => ({
      row: { cable: name, maxSpeed, maxDistance },
      answers: ["maxSpeed"],
      told: ["cable", "maxSpeed", "maxDistance"],
    });
    const cat6 = cable("Cat 6", "10 Gbps", "55 m (10G) / 100 m (1G)");
    const usbC = cable("USB Type-C", "Up to 40 Gbps (TB4)", "2 m (passive)");
    const dvi = cable("DVI-D", "~9.9 Gbps", "5 m");
    const command = (name: string, purpose: string): Subject => ({
      row: { command: name, purpose, syntax: `${name} [name] [type]` },
      answers: ["command"],
      told: ["command", "purpose"],
    });
    const dig = command("dig", "Query DNS servers for a name's records");
    const format = command("format", "Format a disk or partition with a specified file system");
    const rmdir = command("rmdir", "Remove a directory (must be empty, or use /s)");
    const acronym = (short: string, expansion: string): Subject => ({
      row: { acronym: short, expansion },
      answers: ["expansion", "acronym"],
      told: ["acronym", "expansion"],
    });
    const bios = acronym("BIOS", "Basic Input/Output System");
    const attack = acronym("ATT&CK", "Adversarial Tactics, Techniques, and Common Knowledge");

    it("passes sentences that read on from either verdict", () => {
      const sound: [string, Subject][] = [
        ["IMAP uses port 143. The Internet Message Access Protocol is used to synchronize email.", imap],
        ["DHCP uses ports 67 and 68. The server uses port 67, and the client uses port 68.", dhcp],
        ["NetBIOS/NetBT uses ports 137 to 139. NetBIOS over TCP/IP provides name, datagram and session services.", netbios],
        ["SMB uses port 445. Server Message Block (CIFS) provides Windows file and printer sharing.", smb],
        ["Cat 6 has a maximum speed of 10 Gbps. That speed reaches 55 m, and 1 Gbps reaches 100 m.", cat6],
        ["USB Type-C carries up to 40 Gbps with Thunderbolt 4 (TB4). Its maximum distance is 2 m with a passive cable.", usbC],
        ["DVI-D has a maximum speed of about 9.9 Gbps. Its maximum distance is 5 m.", dvi],
        ["The dig command is used to query DNS servers for a name's records.", dig],
        ["The rmdir command is used to remove a directory. The directory must be empty unless the /s switch is used.", rmdir],
        // A name keeps the slash or the ampersand that the exam writes it with.
        ["BIOS stands for Basic Input/Output System.", bios],
        ["ATT&CK stands for Adversarial Tactics, Techniques, and Common Knowledge.", attack],
      ];
      for (const [text, subject] of sound) expect(faults(text, subject), text).toEqual([]);
    });

    // The first six are notes these explanations replaced, as the cards printed them.
    const refused: [what: string, text: string, subject: Subject, fault: RegExp][] = [
      ["a label, an answer and a parenthesis", "IMAP: 143 (Internet Message Access Protocol: sync email)", imap, /joins a label to a fragment/],
      [
        "a pair of ports as the table writes it",
        "67/68: DHCP (Dynamic Host Configuration Protocol (server/client))",
        dhcp,
        /joins figures with a slash or a hyphen.*a parenthesis inside another/,
      ],
      ["a note that ends in a parenthesis", "Cat 6: 10 Gbps (55 m (10G) / 100 m (1G))", cat6, /is not set as a sentence/],
      ["a speed and a distance as the table writes them", "USB Type-C: Up to 40 Gbps (TB4) (2 m (passive))", usbC, /joins a label to a fragment/],
      ["a command and its shell", "format: CMD", format, /has a note where a sentence belongs: "format: CMD"/],
      ["a command and its syntax", "dig: dig [name] [type]", dig, /carries notation/],
      ["a pair of ports with a slash, in a sentence", "DHCP uses port 67/68.", dhcp, /joins figures with a slash or a hyphen/],
      ["a range of ports with a hyphen", "NetBIOS/NetBT uses ports 137-139.", netbios, /joins figures with a slash or a hyphen/],
      ["a syntax set in a sentence", "The dig command is used to query DNS servers for a name's records. Its syntax is dig [name] [type].", dig, /carries notation/],
      ["a place that was not filled", "{protocol} uses port 143.", imap, /a place that was not filled/],
      ["an aside in a parenthesis", "Telnet uses port 23. It provides unencrypted remote terminal access (insecure).", telnet, /not a name or an abbreviation from its row: "\(insecure\)"/],
      [
        "an abbreviation the row does not give",
        "Telnet (TN) uses port 23. It provides unencrypted remote terminal access, which is insecure.",
        telnet,
        /not a name or an abbreviation from its row: "\(TN\)"/,
      ],
      ["two words joined by a slash", "DHCP uses ports 67 and 68. One is for the server/client side.", dhcp, /joins words with a slash: "server\/client"/],
      ["a sign for about", "DVI-D has a maximum speed of ~9.9 Gbps. Its maximum distance is 5 m.", dvi, /a note's shorthand for a figure/],
      ["a note after a sentence", "Telnet uses port 23. Insecure.", telnet, /has a note where a sentence belongs: "Insecure\."/],
      ["no full stop", "The dig command is used to query DNS servers for a name's records", dig, /is not set as a sentence/],
      ["a first word that leans on the verdict", "It is the Internet Message Access Protocol, which uses port 143 as IMAP.", imap, /needs a sentence before it/],
      ["an explanation that leaves the answer out", "IMAP is the Internet Message Access Protocol, which is used to synchronize email.", imap, /does not name the port, "143"/],
      ["the other half of the pair left out", "Port 143 belongs to the Internet Message Access Protocol.", imap, /does not name the protocol, "IMAP"/],
      ["half of a pair of ports", "DHCP uses port 67. The server listens there for requests from clients.", dhcp, /does not name the port, "67\/68"/],
      [
        "a distance that is not the row's",
        "Cat 6 has a maximum speed of 10 Gbps. That speed reaches 50 m, and 1 Gbps reaches 100 m.",
        cat6,
        /does not carry 55 from the maxDistance/,
      ],
      ["three sentences", "IMAP uses port 143. POP3 uses port 110. SMTP uses port 25.", imap, /has 3 sentences/],
      [
        "an explanation that runs on",
        `IMAP uses port 143, which is the port that ${"an email client ".repeat(5)}connects to when it synchronizes email.`,
        imap,
        /runs to 30 words/,
      ],
      ["a contraction", "IMAP uses port 143. It doesn't move email off the server.", imap, /uses a contraction/],
      ["an ampersand", "SMB uses port 445. It provides Windows file & printer sharing.", smb, /an ampersand/],
      ["an ampersand that joins two words of a name", "BIOS stands for Basic Input&Output System.", bios, /an ampersand/],
      ["a slash that the name does not have", "ATT&CK stands for Adversarial Tactics/Techniques, and Common Knowledge.", attack, /joins words with a slash/],
      [
        "a dash between words",
        `IMAP uses port 143 ${String.fromCharCode(0x2014)} the Internet Message Access Protocol.`,
        imap,
        /uses a character outside plain text/,
      ],
    ];

    it.each(refused)("refuses %s", (_what, text, subject, fault) => {
      expect(faults(text, subject).join("; ")).toMatch(fault);
    });
  });
});
