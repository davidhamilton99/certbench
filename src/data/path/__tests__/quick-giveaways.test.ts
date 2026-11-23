import { describe, expect, it } from "vitest";
import { PATH_CONTENT, type PathContent } from "../index";
import { SY0_801_PATH_CONTENT } from "../security-plus-sy0-801";
import type { AuthoredChoice } from "../types";

/**
 * A quick question must not give its answer away. A prompt that shares a
 * distinctive word with the correct answer alone ("A program writes more data
 * into a memory buffer" beside "Buffer overflow") lets a learner who does not
 * know the term choose it by matching the words (the final review's FW-09, 23
 * November 2026).
 *
 * A distinctive word has four letters or more and is not a common word, and a
 * plural counts as its singular ("alerts" is "alert"). An option holds it when
 * one of the option's words is the word, ends with it ("Subprocessor" holds
 * "processor") or shares its root: one of the two words begins with the other
 * ("attack" and "attacker", "signing" and the "sign" of "sign-on"), or both
 * begin with the same five letters ("restoring" and "restoration"). Two words
 * that share only their first four letters ("server" and "service", "company"
 * and "competitor") name nothing, so they are not looked for. An acronym ("AI",
 * "DNS") counts at any length, as it is written. A word that only a wrong
 * answer holds is a lure, which asks the learner to know the difference, so it
 * is not looked for either. Words of three letters ("log", "key", "map") are
 * not read, because ordinary short words would be found with them ("and" in
 * "Living off the land", "use" in "User provisioning"): the questions reworded
 * to lose one are held by hand below. In the content files the correct answer
 * is always the first option (src/data/path/types.ts).
 */

// Every exam on the study path, plus Security+ SY0-801 if it is not yet among them.
const CONTENT: [string, PathContent][] = Object.entries(PATH_CONTENT);
if (!CONTENT.some(([cert]) => cert === "security-plus-sy0-801")) {
  CONTENT.push(["security-plus-sy0-801", SY0_801_PATH_CONTENT]);
}

const quickOf = (content: PathContent): AuthoredChoice[] =>
  [...content.authored, ...(content.warmup.authored ?? [])].filter(
    (r): r is AuthoredChoice => r.kind === "choice" && r.tier === "quick"
  );

/** Words of four letters or more that name no answer: the language around a question. */
const COMMON = new Set([
  "about", "after", "again", "against", "always", "among", "because", "before", "being", "below", "between",
  "called", "could", "during", "every", "first", "never", "other", "second", "should", "since", "still",
  "their", "there", "these", "thing", "think", "those", "three", "through", "under", "until", "using",
  "where", "which", "while", "within", "without", "would",
]);

/** A word in lower case, with a plural reduced to its singular: "alerts" to "alert", "policies" to "policy". */
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

const piecesOf = (text: string) => text.split(/[^A-Za-z0-9]+/).filter(Boolean);
const wordsOf = (text: string) => piecesOf(text).map(stem);

/** A word written with two capitals or more: an acronym ("AI", "IaaS"), read as it is written. */
const isAcronym = (piece: string) => /[A-Z].*[A-Z]/.test(piece);

/** Whether an option's word is the prompt's word, ends with it or shares its root (see above). */
function sharesRoot(optionWord: string, word: string): boolean {
  if (optionWord.endsWith(word) || optionWord.startsWith(word)) return true;
  if (optionWord.length >= 4 && word.startsWith(optionWord)) return true;
  return optionWord.length >= 5 && word.length >= 5 && optionWord.slice(0, 5) === word.slice(0, 5);
}

/** Whether an option holds the word: an acronym as it is written, any other word by its root. */
const holds = (option: string, word: string) =>
  isAcronym(word) ? piecesOf(option).some((p) => p === word || p === `${word}s`) : wordsOf(option).some((w) => sharesRoot(w, word));

/** The prompt's acronyms, and its words of four letters or more that are not common words. */
function distinctiveWords(prompt: string): Set<string> {
  const found = new Set<string>();
  for (const piece of piecesOf(prompt)) {
    const word = stem(piece);
    if (isAcronym(piece)) found.add(piece.endsWith("s") && isAcronym(piece.slice(0, -1)) ? piece.slice(0, -1) : piece);
    else if (word.length >= 4 && !COMMON.has(word)) found.add(word);
  }
  return found;
}

/** Each distinctive word of the prompt that the correct option holds and no other option does. */
function giveaways(prompt: string, options: readonly string[]): string[] {
  return [...distinctiveWords(prompt)].filter((word) => holds(options[0], word) && options.slice(1).every((o) => !holds(o, word)));
}

// Question 5.2g is the same in both Security+ versions.
const RISK_REGISTER =
  "Inherent: a risk register is the record of identified risks, so the prompt has to say that risks are what it tracks; threats or findings would change what is asked.";

/**
 * The quick questions that the guard finds and that cannot lose the word
 * without changing what is asked, by exam and key, with the words found: each
 * answer is named for what its prompt must describe. Every other question the
 * guard found was reworded so that it no longer names its answer. An exception
 * that is no longer needed fails the second test, so this list only shrinks.
 */
const EXCEPTIONS: Record<string, { words: string[]; reason: string }> = {
  "security-plus-sy0-701|5.2g": { words: ["risk"], reason: RISK_REGISTER },
  "security-plus-sy0-801|5.2g": { words: ["risk"], reason: RISK_REGISTER },
  "security-plus-sy0-801|self-signed": { words: ["signed"], reason: "Inherent: the answers are reasons, and the correct one says who signed the certificate, which the prompt has to state." },
  "security-plus-sy0-801|prioritization": { words: ["internet", "facing", "exploited"], reason: "Inherent: the answers restate the two flaws, so the correct one repeats the prompt's own facts." },
  "security-plus-sy0-801|plaintext-strings": { words: ["string"], reason: "Inherent: strings is the command whose output the indicator is named for." },
  "security-plus-sy0-801|gmsa": { words: ["service"], reason: "Inherent: the question asks which account fits a Windows service, and a group managed service account is named for the service." },
  "security-plus-sy0-801|selinux": { words: ["linux"], reason: "Inherent: the question asks for a Linux feature, and SELinux carries the platform's name." },
  "security-plus-sy0-801|mandatory-notification": { words: ["customer"], reason: "Inherent: the answer names whom the company must tell, and the prompt has to say whose data was exposed." },
  "security-plus-sy0-801|legal-orders": { words: ["order"], reason: "Inherent: the answers are replies to a court order, which the prompt has to describe." },
};

/**
 * The same, for a word of three letters, which the rule does not read: the
 * prompt and the correct option alone hold it, and the answer is named for what
 * its prompt must describe. An entry whose word has gone fails the test that
 * reads this list, so it only shrinks too.
 */
const SHORT_EXCEPTIONS: Record<string, { word: string; reason: string }> = {
  "security-plus-sy0-801|syslog": {
    word: "log",
    reason: "Inherent: Syslog is named for the log messages it carries, so the prompt has to say that they are log messages; event messages would let SNMP traps fit as well.",
  },
};

const repAt = (cert: string, key: string) =>
  quickOf(CONTENT.find(([c]) => c === cert)?.[1] ?? { authored: [], warmup: {}, recallTables: {} }).find((r) => r.key === key);

describe("quick questions that give their answer away", () => {
  it("share no distinctive word with their correct answer alone, apart from the listed exceptions", () => {
    const found: string[] = [];
    for (const [cert, content] of CONTENT) {
      for (const r of quickOf(content)) {
        const allowed = EXCEPTIONS[`${cert}|${r.key}`]?.words ?? [];
        for (const word of giveaways(r.prompt, r.options)) {
          if (!allowed.includes(word)) found.push(`${cert} ${r.key}: "${word}" in "${r.prompt}" names "${r.options[0]}"`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("lists no exception that is no longer needed, and gives each one a reason", () => {
    for (const [at, { words, reason }] of Object.entries(EXCEPTIONS)) {
      const [cert, key] = at.split("|");
      const r = repAt(cert, key);
      expect(r, `${at} is not a quick question`).toBeDefined();
      expect(giveaways(r!.prompt, r!.options).sort(), at).toEqual([...words].sort());
      expect(reason.length, at).toBeGreaterThan(30);
    }
  });

  it("lists each inherent short word that is still there, with a reason", () => {
    for (const [at, { word, reason }] of Object.entries(SHORT_EXCEPTIONS)) {
      const [cert, key] = at.split("|");
      const r = repAt(cert, key);
      expect(r, `${at} is not a quick question`).toBeDefined();
      const holdsWord = (text: string) => text.toLowerCase().includes(word);
      expect(holdsWord(r!.prompt), at).toBe(true);
      expect(r!.options.map(holdsWord), at).toEqual([true, false, false, false]);
      expect(reason.length, at).toBeGreaterThan(30);
    }
  });

  it("reads the quick questions of both Security+ exams", () => {
    for (const cert of ["security-plus-sy0-701", "security-plus-sy0-801"]) {
      expect(quickOf(CONTENT.find(([c]) => c === cert)![1]).length, cert).toBeGreaterThan(100);
    }
  });

  // The final review found these three by a word shorter than five letters,
  // which the rule did not read at the time, so they were held here, and stay.
  it("keeps the short words that gave three answers away out of their prompts", () => {
    for (const cert of ["security-plus-sy0-701", "security-plus-sy0-801"]) {
      expect(repAt(cert, "4.3c")?.prompt, `${cert} 4.3c`).not.toMatch(/\bbugs?\b/i);
    }
    expect(repAt("security-plus-sy0-801", "mfa-bypass")?.prompt).not.toMatch(/\bMFA\b/);
    expect(repAt("security-plus-sy0-801", "cache-poisoning")?.prompt).not.toMatch(/\bDNS\b/);
  });

  // Round 8 removed these by hand, where the rule could not see the word: a
  // shorter one, a common one or a shared root ("ticket" and "Ticketing").
  it("keeps the shorter words and shared roots that named six more answers out of their prompts", () => {
    for (const cert of ["security-plus-sy0-701", "security-plus-sy0-801"]) {
      expect(repAt(cert, "4.7c")?.prompt, `${cert} 4.7c`).not.toMatch(/ticket/i);
    }
    expect(repAt("security-plus-sy0-801", "fileless")?.prompt).not.toMatch(/\bfiles?\b|malware|malicious/i);
    expect(repAt("security-plus-sy0-801", "functional-testing")?.prompt).not.toMatch(/\btest/i);
    expect(repAt("security-plus-sy0-801", "packet-analyzer")?.prompt).not.toMatch(/analy[sz]/i);
    expect(repAt("security-plus-sy0-801", "mtbf")?.prompt).not.toMatch(/\bfail|\bbetween\b/i);
    expect(repAt("security-plus-sy0-801", "audit-charter")?.prompt).not.toMatch(/audit/i);
  });

  // Round 9 reworded these where the rule cannot see the word: one of three
  // letters ("maps" beside "A heat map", "log", the "key" of "A passkey"), or
  // two words that share only their first four letters ("signature" and "Code
  // signing").
  it("keeps the words of three letters and the short roots that named four more answers out of their prompts", () => {
    expect(repAt("security-plus-sy0-701", "4.1c")?.prompt).not.toMatch(/\bmap/i);
    for (const cert of ["security-plus-sy0-701", "security-plus-sy0-801"]) {
      expect(repAt(cert, "4.1f")?.prompt, `${cert} 4.1f`).not.toMatch(/\bsign/i);
    }
    expect(repAt("security-plus-sy0-801", "log-manipulation")?.prompt).not.toMatch(/\blog/i);
    expect(repAt("security-plus-sy0-801", "passkey")?.prompt).not.toMatch(/key/i);
  });

  describe("the rule itself", () => {
    const cases: [what: string, prompt: string, options: string[], found: string[]][] = [
      [
        "finds the word that the correct answer alone holds",
        "A program writes more data into a memory buffer than it can hold, overwriting nearby memory. What is this called?",
        ["Buffer overflow", "Race condition", "Resource reuse", "Zero-day"],
        ["buffer"],
      ],
      [
        "reads a plural as its singular",
        "Harmless events keep triggering alerts, so the team adjusts the rules. What is this called?",
        ["Alert tuning", "Quarantine", "Archiving", "Log aggregation"],
        ["alert"],
      ],
      [
        "finds a word at the end of an answer's word",
        "A payroll processor hires a hosting company to store its clients' employee data. Which role does the hosting company have?",
        ["Subprocessor", "Data controller", "Data owner", "Data subject"],
        ["processor"],
      ],
      [
        "passes a word that only a wrong answer holds, which is a lure",
        "Attackers deface a company's website to protest its environmental record. Which threat actor?",
        ["Hacktivist", "Nation-state", "Insider threat", "Organized crime"],
        [],
      ],
      [
        "passes a word that two answers hold",
        "A web request includes a path that climbs out of the web root to read files. Which attack?",
        ["Directory traversal", "SQL injection attack", "Cross-site scripting", "Replay attack"],
        [],
      ],
      [
        "passes the reworded question",
        "A program writes more data into a fixed block of memory than it can hold, overwriting nearby memory. What is this called?",
        ["Buffer overflow", "Race condition", "Resource reuse", "Zero-day"],
        [],
      ],
      [
        "finds a root that an answer's word begins with",
        "Someone downloads a ready-made attack tool and runs it with little idea how it works. Which threat actor?",
        ["Unskilled attacker", "Hacktivist", "Nation-state", "Shadow IT"],
        ["attack"],
      ],
      [
        "finds an answer's word that the prompt's word begins with",
        "One login gives access to email, HR and the wiki without signing in again. What is this called?",
        ["Single sign-on", "Multifactor authentication", "Attestation", "Just-in-time access"],
        ["signing"],
      ],
      [
        "finds two words that begin with the same five letters",
        "Backups have run every night for a year, but no one has tried restoring one. What is missing?",
        ["Restoration testing", "Immutability", "A longer retention period", "Capacity planning"],
        ["restoring"],
      ],
      [
        "finds a word of four letters",
        "Which tool alerts when a critical system file changes unexpectedly?",
        ["File integrity monitoring", "DNS filtering", "Web filter", "NAC"],
        ["file"],
      ],
      [
        "finds an acronym that the correct answer alone holds",
        "An AI learns what normal activity looks like for each user and keeps adjusting it as behavior changes. What is this called?",
        ["An AI-augmented baseline", "A static threshold", "A chatbot", "Ticket management"],
        ["AI"],
      ],
      [
        "passes two words that share only their first four letters",
        "A new certificate is installed, but the web server keeps presenting the old one. What step was missed?",
        ["Restarting the service", "Updating the diagrams", "Testing the backout plan", "Getting CAB approval"],
        [],
      ],
      [
        "passes an acronym that only a wrong answer holds",
        "An AI model uses past incidents and current telemetry to forecast which systems attackers will likely target next. What is this called?",
        ["Predictive analysis", "Agentic AI", "A chatbot", "Desired state management"],
        [],
      ],
    ];
    it.each(cases)("%s", (_what, prompt, options, found) => {
      expect(giveaways(prompt, options)).toEqual(found);
    });
  });
});

// The final review's FW-01: the rewritten prompt of 4.7b named a category,
// "automated controls", that only the correct answer (guard rails) fits.
describe("question 4.7b in both Security+ versions", () => {
  it("asks what it is called, and names no category that only the correct answer fits", () => {
    for (const [cert, content] of CONTENT.filter(([c]) => c.startsWith("security-plus"))) {
      const r = quickOf(content).find((q) => q.key === "4.7b");
      expect(r, cert).toBeDefined();
      expect(r!.prompt, cert).toBe("Automation blocks any cloud resource deployed without encryption turned on. What is this called?");
      expect(r!.prompt, cert).not.toMatch(/\bcontrols?\b/i);
    }
  });
});

// Round 8 wrote these two plainly: the canary account's prompt had read "an
// unused but tempting user", and the root cause's "What is finding why the
// breach happened called?".
describe("the canary account and root cause questions", () => {
  it("ask plainly what each is called", () => {
    expect(repAt("security-plus-sy0-801", "canary-account")?.prompt).toBe(
      'Admins create a user named "backup_admin" that nobody uses, and any attempt to sign in as that user raises an alert. What is this called?'
    );
    expect(repAt("security-plus-sy0-801", "root-cause-analysis")?.prompt).toBe(
      "Investigators trace a breach back to an unpatched VPN appliance nobody owned. What is this called?"
    );
  });
});
