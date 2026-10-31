import type { BankQuestion, PathBank } from "./bank";
import { PATH_CONTENT } from "@/data/path";
import type { AuthoredRep } from "@/data/path/types";
import { getRecallDecks } from "@/data/recall";
import { generateRecallQuestion, type ResolvedDeck } from "@/lib/recall/recall-deck";
import { acceptableAnswers } from "@/lib/recall/normalize";
import {
  CHECKPOINT_SIZE,
  LEARN_NEW_REPS,
  MAX_RESURFACED,
  PRACTICE_SIZE,
  stopAt,
} from "@/core/path/plan";
import { allocate, composeStop, seededRng, shuffle, shuffleOptions, type Rng } from "@/core/path/compose";
import { authoredRepId, bankRepId, parseRepId, recallRepId, shortHash } from "@/core/path/rep-id";
import { mentionsOptionLetter, repairText, splitExplanation } from "@/core/path/text";
import type { ChoiceRep, PathCert, PathPlan, PathStop, Rep } from "@/core/path/types";

/**
 * Builds one stop of a path from the exam's three sources: hand-written reps,
 * recall facts from the reference tables, and the question bank. Pure given a
 * bank, so it's tested without a database.
 */

/** Quick reps from the bank: short question, short options. */
const isQuick = (q: BankQuestion) => q.words <= 25 && q.optionWords <= 6;
const isShort = (q: BankQuestion) => q.words <= 30;
/** The checkpoint prefers exam-style questions that don't run on. */
const CHECKPOINT_MAX_WORDS = 45;

const LABELS = { recall: "Recall", quick: "Quick scenario", exam: "Exam style" } as const;

export function authoredToRep(a: AuthoredRep, rng: Rng): Rep {
  const id = authoredRepId(a.objective, a.key);
  if (a.kind === "typed") {
    return {
      id,
      type: "typed",
      label: LABELS.recall,
      tier: "recall",
      objective: a.objective,
      prompt: a.prompt,
      cue: a.cue,
      accept: acceptableAnswers(a.answer),
      answerText: a.answer,
      takeaway: a.takeaway,
      numeric: a.numeric,
    };
  }
  return shuffleOptions(
    {
      id,
      type: "choice",
      label: LABELS[a.tier],
      tier: a.tier,
      objective: a.objective,
      prompt: a.prompt,
      options: [...a.options],
      answer: 0,
      takeaway: a.takeaway,
      mono: a.mono,
    },
    rng
  );
}

/**
 * A bank question as a rep. Options are shuffled (the stored order favours B)
 * unless the explanation names options by letter; `order` maps each displayed
 * option back to its stored position for recording the answer.
 */
export function bankToRep(q: BankQuestion, tier: "quick" | "exam", rng: Rng): ChoiceRep {
  const { takeaway, rest } = splitExplanation(q.explanation);
  const stored = q.options.map(repairText);
  const order = mentionsOptionLetter(rest)
    ? stored.map((_, i) => i)
    : shuffle(stored.map((_, i) => i), rng);
  return {
    id: bankRepId(q.objective, q.id),
    type: "choice",
    label: LABELS[tier],
    tier,
    objective: q.objective,
    prompt: repairText(q.text),
    options: order.map((i) => stored[i]),
    answer: order.indexOf(q.answer),
    takeaway,
    explanation: rest || undefined,
    lettered: true,
    order,
  };
}

const NUMERIC = /^[\d\s/,–-]+$/;

function recallToRep(deck: ResolvedDeck, itemId: string, objective: string, rng: Rng, typed: boolean): Rep {
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
      label: LABELS.recall,
      tier: "recall",
      objective,
      prompt: q.promptValue,
      cue: `Type the ${q.answerLabel}`,
      accept: q.acceptable,
      answerText: q.answer,
      takeaway,
      numeric: NUMERIC.test(q.answer),
    };
  }
  return {
    id,
    type: "choice",
    label: LABELS.recall,
    tier: "recall",
    objective,
    prompt: q.promptValue,
    cue: `Which ${q.answerLabel}?`,
    options: q.options,
    answer: q.options.indexOf(q.answer),
    takeaway,
    mono: q.options.every((o) => NUMERIC.test(o)),
  };
}

/** Distinct facts in a deck, by its cue column. */
function deckItems(deck: ResolvedDeck): string[] {
  const seen = new Set<string>();
  for (const row of deck.rows) {
    const v = row[deck.config.ask.key];
    if (v) seen.add(v);
  }
  return [...seen];
}

/** Bank questions ordered shortest first, ties shuffled by the stop's seed. */
function byLength(questions: BankQuestion[], rng: Rng): BankQuestion[] {
  const keyed = questions.map((q) => ({ q, k: rng() }));
  keyed.sort((a, b) => a.q.words - b.q.words || a.k - b.k);
  return keyed.map((x) => x.q);
}

/** Interleave groups so a run of picks covers many objectives, not one. */
function roundRobin<T>(groups: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (i < g.length) out.push(g[i]);
  return out;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    out.set(k, [...(out.get(k) ?? []), item]);
  }
  return out;
}

export interface BuildStopInput {
  bank: PathBank;
  plan: PathPlan;
  index: number;
  /** Rep ids the learner has answered before. */
  seen: readonly string[];
  /** Rep ids whose latest answer was wrong, oldest first. */
  missed: readonly string[];
  seed: number;
}

export interface BuiltStop {
  stop: PathStop;
  reps: Rep[];
}

export function buildStop({ bank, plan, index, seen, missed, seed }: BuildStopInput): BuiltStop | null {
  const slug = bank.structure.certSlug as PathCert;
  const content = PATH_CONTENT[slug];
  if (!content) return null;
  const stop = stopAt(plan, bank.structure, index);
  if (!stop) return null;

  const rng = seededRng(seed);
  const seenSet = new Set(seen);
  const decks = new Map(getRecallDecks(slug).map((d) => [d.config.tableId, d] as const));
  const deckById = new Map([...decks.values()].map((d) => [d.config.id, d] as const));
  const authoredByKey = new Map(
    [...content.authored, ...(content.warmup.authored ?? [])].map((a) => [authoredRepId(a.objective, a.key), a] as const)
  );

  /** Turn a stored rep id back into a rep (for misses coming back). */
  const resolve = (id: string): Rep | null => {
    const parsed = parseRepId(id);
    if (!parsed) return null;
    if (parsed.source === "a") {
      const a = authoredByKey.get(id);
      return a ? authoredToRep(a, rng) : null;
    }
    if (parsed.source === "q") {
      const q = bank.byId.get(parsed.key);
      return q ? bankToRep(q, isShort(q) ? "quick" : "exam", rng) : null;
    }
    const [deckId, hash] = parsed.key.split("|");
    const deck = deckById.get(deckId);
    const item = deck && deckItems(deck).find((v) => shortHash(v) === hash);
    return deck && item ? recallToRep(deck, item, parsed.objective, rng, false) : null;
  };
  const misses = (limit: number) =>
    missed
      .slice(0, limit * 3)
      .map(resolve)
      .filter((r): r is Rep => r !== null)
      .slice(0, limit);

  /** Recall reps for an objective from its mapped tables, unseen facts first. */
  const recallFor = (tableId: string, objective: string, count: number, typedLast: boolean): Rep[] => {
    const deck = decks.get(tableId);
    if (!deck || count <= 0) return [];
    const items = shuffle(deckItems(deck), rng);
    const fresh = items.filter((v) => !seenSet.has(recallRepId(objective, deck.config.id, v)));
    const picked = [...fresh, ...items.filter((v) => !fresh.includes(v))].slice(0, count);
    return picked.map((item, i) =>
      recallToRep(deck, item, objective, rng, typedLast && deck.typeable && i === picked.length - 1 && count >= 3)
    );
  };

  const reps = (() => {
    switch (stop.kind) {
      case "warmup":
        return warmupReps();
      case "learn":
        return learnReps(stop.objectives[0]);
      case "practice":
        return practiceReps(stop.objectives);
      case "checkpoint":
        return checkpointReps();
      case "review":
        return reviewReps();
    }
  })();

  return { stop, reps };

  function warmupReps(): Rep[] {
    if (content.warmup.authored?.length) {
      const fresh = content.warmup.authored.map((a) => authoredToRep(a, rng));
      return composeStop({ misses: [], fresh }, { size: fresh.length, maxMisses: 0, seen: new Set() });
    }
    const recall: Rep[] = [];
    for (const { tableId, count } of content.warmup.decks ?? []) {
      const objective = content.recallTables[tableId] ?? "";
      recall.push(...recallFor(tableId, objective, count, false));
    }
    // The bank's snappiest questions, one per domain, then an exam-style
    // closer — skipping objectives the recall facts above already cover.
    const covered = new Set((content.warmup.decks ?? []).map((d) => content.recallTables[d.tableId]));
    const quick = byLength(
      bank.questions.filter((q) => q.words <= 20 && q.optionWords <= 5 && !covered.has(q.objective)),
      rng
    );
    const perDomain = roundRobin([...groupBy(quick, (q) => q.domain).values()]).slice(0, content.warmup.bank ?? 0);
    const used = new Set(perDomain.map((q) => q.id));
    const closer = byLength(bank.questions.filter((q) => !used.has(q.id) && q.words > 20 && q.words <= 40), rng)[0];
    return [
      ...recall,
      ...perDomain.map((q) => bankToRep(q, "quick", rng)),
      ...(closer ? [bankToRep(closer, "exam", rng)] : []),
    ];
  }

  function learnReps(objective: string): Rep[] {
    const pool = bank.questions.filter((q) => q.objective === objective);
    const authored = content.authored.filter((a) => a.objective === objective);
    let fresh: Rep[];
    if (authored.length > 0) {
      fresh = authored.map((a) => authoredToRep(a, rng));
    } else {
      const tables = Object.entries(content.recallTables)
        .filter(([, obj]) => obj === objective)
        .map(([tableId]) => tableId);
      const recall = tables.flatMap((t) => recallFor(t, objective, Math.ceil(3 / tables.length), true)).slice(0, 3);
      const quick = byLength(pool.filter(isQuick), rng).map((q) => bankToRep(q, "quick", rng));
      const short = byLength(pool.filter((q) => isShort(q) && !isQuick(q)), rng).map((q) => bankToRep(q, "quick", rng));
      fresh = [...recall, ...quick, ...short];
      // A thin objective still fills its stop, shortest questions first —
      // leaving the rest for the closing exam-style rep.
      if (fresh.length < LEARN_NEW_REPS) {
        fresh.push(
          ...byLength(pool.filter((q) => !isShort(q)), rng)
            .slice(0, LEARN_NEW_REPS - fresh.length)
            .map((q) => bankToRep(q, "exam", rng))
        );
      }
    }
    const inFresh = new Set(fresh.map((r) => r.id));
    const closers = byLength(pool, rng)
      .map((q) => bankToRep(q, "exam", rng))
      .filter((r) => !inFresh.has(r.id));
    return composeStop(
      { misses: misses(MAX_RESURFACED), fresh, closers },
      { size: LEARN_NEW_REPS, maxMisses: MAX_RESURFACED, seen: seenSet }
    );
  }

  function practiceReps(objectives: string[]): Rep[] {
    const set = new Set(objectives);
    const groups = groupBy(
      byLength(bank.questions.filter((q) => set.has(q.objective)), rng),
      (q) => q.objective
    );
    // Unseen first within each objective, so repeat visits move on.
    const ordered = [...groups.values()].map((g) => [
      ...g.filter((q) => !seenSet.has(bankRepId(q.objective, q.id))),
      ...g.filter((q) => seenSet.has(bankRepId(q.objective, q.id))),
    ]);
    const fresh = roundRobin(ordered).map((q) => bankToRep(q, isShort(q) ? "quick" : "exam", rng));
    return composeStop(
      { misses: misses(MAX_RESURFACED), fresh },
      { size: PRACTICE_SIZE, maxMisses: MAX_RESURFACED, seen: seenSet }
    );
  }

  function checkpointReps(): Rep[] {
    const domains = bank.structure.domains;
    const slots = allocate(domains.map((d) => d.weight), CHECKPOINT_SIZE);
    const picked: BankQuestion[] = [];
    domains.forEach((d, i) => {
      const candidates = bank.questions.filter((q) => q.domain === d.number);
      // Unseen and readable first, then unseen but long, then seen. Within each
      // tier, spread across objectives.
      const rank = (q: BankQuestion) =>
        (seenSet.has(bankRepId(q.objective, q.id)) ? 2 : 0) + (q.words > CHECKPOINT_MAX_WORDS ? 1 : 0);
      const tiers = groupBy(shuffle(candidates, rng), (q) => String(rank(q)));
      const ordered = ["0", "1", "2", "3"].flatMap((t) =>
        roundRobin([...groupBy(tiers.get(t) ?? [], (q) => q.objective).values()])
      );
      picked.push(...ordered.slice(0, slots[i]));
    });
    return shuffle(picked, rng).map((q) => bankToRep(q, "exam", rng));
  }

  function reviewReps(): Rep[] {
    const back = misses(MAX_RESURFACED * 2);
    // Weakest domains first: the ones with the most outstanding misses.
    const missCount = new Map<string, number>();
    for (const id of missed) {
      const q = bank.byId.get(parseRepId(id)?.key ?? "");
      if (q) missCount.set(q.domain, (missCount.get(q.domain) ?? 0) + 1);
    }
    const domainOrder = [...bank.structure.domains]
      .sort((a, b) => (missCount.get(b.number) ?? 0) - (missCount.get(a.number) ?? 0) || b.weight - a.weight)
      .map((d) => d.number);
    const unseen = bank.questions.filter((q) => !seenSet.has(bankRepId(q.objective, q.id)));
    const source = unseen.length >= PRACTICE_SIZE ? unseen : bank.questions;
    const groups = groupBy(byLength(source, rng), (q) => q.domain);
    const fresh = roundRobin(domainOrder.map((d) => groups.get(d) ?? [])).map((q) =>
      bankToRep(q, isShort(q) ? "quick" : "exam", rng)
    );
    return composeStop(
      { misses: back, fresh },
      { size: PRACTICE_SIZE - back.length, maxMisses: back.length, seen: seenSet }
    );
  }
}
