import { generateRecallQuestion, type ResolvedDeck } from "@/lib/recall/recall-deck";
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

/** One fact from a recall deck, asked either way round (typed: always the deck's own way). */
export function recallToRep(deck: ResolvedDeck, itemId: string, objective: string, rng: Rng, typed: boolean): Rep {
  const q = generateRecallQuestion(deck, rng, { itemId, noSwap: typed });
  const id = recallRepId(objective, deck.config.id, q.itemId);
  // One line: the pairing and its first detail. A long cue (a description)
  // isn't repeated back — the answer and its detail are what to remember.
  const detail = q.detail.split(" · ")[0];
  const takeaway =
    q.promptValue.length > 24
      ? detail
        ? `${q.answer}: ${detail}`
        : q.answer
      : `${q.promptValue} → ${q.answer}${detail ? ` · ${detail}` : ""}`;
  if (typed) {
    return {
      id,
      type: "typed",
      label: "Recall",
      tier: "recall",
      objective,
      prompt: q.promptValue,
      cue: `Type the ${prettyLabel(q.answerLabel)}`,
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
    prompt: q.promptValue,
    cue: `Which ${prettyLabel(q.answerLabel)}?`,
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
 * first worked step is the takeaway, the rest folds away.
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
  const text = `${q.prompt} ${q.promptValue}`;
  return {
    id,
    type: "typed",
    label: "Hands-on",
    tier: "quick",
    objective,
    prompt: /^(What|How|Which|Are)\b/.test(q.prompt) ? `${text}?` : text,
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
