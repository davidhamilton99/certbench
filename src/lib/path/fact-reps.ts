import { RECALL_QUESTIONS } from "@/data/recall/questions";
import { generateRecallQuestion, otherAnswers, otherAnswersSentence, type ResolvedDeck } from "@/lib/recall/recall-deck";
import { generateQuestion, MODES as SUBNET_MODES, type Difficulty, type DrillMode } from "@/lib/tools/subnetting";
import type { Rng } from "@/core/path/compose";
import { recallRepId } from "@/core/path/rep-id";
import type { Rep } from "@/core/path/types";

/**
 * Facts and hands-on problems as reps: a recall fact from a reference deck
 * (ports, acronyms) and a subnetting problem. The path builds its stops from
 * these, and the free tool pages play their drills with them, so a port or a
 * subnet looks and answers the same on both. Pure and client-safe.
 */

const NUMERIC = /^[\d\s/,–-]+$/;

/** Column labels arrive lowercased ("cidr"); put acronyms back in capitals. */
const ACRONYMS = new Set(["cidr", "ip", "ipv4", "ipv6", "osi", "dns", "mac", "tcp", "udp", "os", "url", "vlan", "ssid", "wpa", "raid", "ram", "cpu", "gpu", "pdu", "nic"]);
const prettyLabel = (label: string) =>
  label
    .split(" ")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w))
    .join(" ");

/** "{value}", or "{value:lowerFirst}" for a cell set inside a sentence, in a question template. */
const VALUE = /\{value(:lowerFirst)?\}/g;

/** "List directory contents" becomes "list directory contents"; a first word in capitals ("DNS") is an acronym and stays. */
const lowerFirst = (cell: string) => (/^[A-Z][a-z]/.test(cell) ? cell[0].toLowerCase() + cell.slice(1) : cell);

/**
 * A deck's question as a sentence that names the term ("Which port or ports
 * does POP3S use?"), from its template in src/data/recall/questions.ts, or
 * null for a deck that has none: that deck prints the term, with a cue under
 * it that the card reads as part of the question. `reversed`: the deck's
 * answer column is the cue.
 */
function questionFor(deckId: string, cue: string, reversed: boolean): string | null {
  const text = RECALL_QUESTIONS[deckId];
  if (!text) return null;
  const own = text.rows?.[cue];
  if (own) return own;
  const template = reversed ? text.reverse : text.ask;
  return template ? template.replace(VALUE, (_, lower?: string) => (lower ? lowerFirst(cue) : cue)) : null;
}

/** One fact from a recall deck, asked either way round (typed: always the deck's own way). */
export function recallToRep(deck: ResolvedDeck, itemId: string, objective: string, rng: Rng, typed: boolean): Rep {
  const q = generateRecallQuestion(deck, rng, { itemId, noSwap: typed });
  const id = recallRepId(objective, deck.config.id, q.itemId);
  // Asked the deck's own way, the cue is the row's item; asked the other way,
  // it is the answer column's cell.
  const question = questionFor(deck.config.id, q.promptValue, q.promptValue !== q.itemId);
  // The card prints the takeaway straight after its verdict ("Correct." or
  // "Incorrect. The correct answer is 22."). A deck that explains its answers
  // in sentences (the `explain` of its configuration) gives those sentences,
  // the same ones whichever way round the fact was asked. Any other deck keeps
  // its note: the pairing and its first detail. A long cue (a description) is
  // not repeated back in a note, because the answer and its detail are what to
  // remember.
  const detail = q.details[0];
  const note =
    q.promptValue.length > 24
      ? detail
        ? `${q.answer}: ${detail}`
        : q.answer
      : `${q.promptValue}: ${q.answer}${detail ? ` (${detail})` : ""}`;
  // A cue can name more than one row (RADIUS has a row for its ports and a row
  // for its legacy ports). A typed answer from any of them is accepted, so the
  // card says which answer it asked for and that the other is correct too.
  const also = otherAnswersSentence(q.promptValue, q.answer, otherAnswers(deck, q.promptValue, q.answer));
  const takeaway = [q.explanation ?? note, also].filter(Boolean).join(" ");
  if (typed) {
    return {
      id,
      type: "typed",
      label: "Recall",
      tier: "recall",
      objective,
      prompt: question ?? q.promptValue,
      // A typed card is always asked the deck's own way, so the field's words
      // follow that question where the deck gives them.
      cue: RECALL_QUESTIONS[deck.config.id]?.typedCue ?? `Type the ${prettyLabel(q.answerLabel)}`,
      accept: q.acceptable,
      answerText: q.answer,
      takeaway,
      numeric: NUMERIC.test(q.answer),
    };
  }
  return {
    id,
    type: "choice",
    label: "Recall",
    tier: "recall",
    objective,
    prompt: question ?? q.promptValue,
    // The sentence is the whole question. Without one, the term is printed
    // and this says what is asked of it.
    ...(question ? {} : { cue: `Which ${prettyLabel(q.answerLabel)}?` }),
    options: q.options,
    answer: q.options.indexOf(q.answer),
    takeaway,
    mono: q.options.every((o) => NUMERIC.test(o)),
  };
}

/** Rep ids for subnetting problems: one per skill, `r|<objective>|subnet|<mode>`. */
export const SUBNET_DECK = "subnet";
export const isDrillMode = (v: string): v is DrillMode => SUBNET_MODES.some((m) => m.id === v);
export const subnetRepId = (objective: string, mode: DrillMode) => `r|${objective}|${SUBNET_DECK}|${mode}`;

/**
 * A fresh hands-on subnetting problem for one skill. "Same subnet?" is a
 * yes/no choice; the rest are typed and graded by the subnetting engine. The
 * question is the engine's own sentence, the first worked step is the
 * takeaway, and the rest folds away.
 */
export function subnetToRep(objective: string, mode: DrillMode, rng: Rng, difficulty: Difficulty = "standard"): Rep {
  const q = generateQuestion(mode, difficulty, rng);
  const id = subnetRepId(objective, mode);
  const [first = "", ...more] = q.solution;
  const explanation = more.length ? more.join(" ") : undefined;
  if (q.answerKind === "yes-no") {
    return {
      id,
      type: "choice",
      label: "Hands-on",
      tier: "quick",
      objective,
      prompt: q.prompt,
      cue: q.promptValue,
      options: ["Yes", "No"],
      answer: q.answer === "yes" ? 0 : 1,
      takeaway: first,
      explanation,
    };
  }
  return {
    id,
    type: "typed",
    label: "Hands-on",
    tier: "quick",
    objective,
    prompt: q.sentence,
    cue: "Your answer",
    accept: [q.answer],
    answerText: q.answerKind === "cidr" ? `/${q.answer}` : q.answer,
    answerKind: q.answerKind,
    placeholder: q.placeholder,
    numeric: q.answerKind === "count",
    takeaway: first,
    explanation,
  };
}
