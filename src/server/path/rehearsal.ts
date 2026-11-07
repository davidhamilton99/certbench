import type { BankQuestion, PathBank } from "./bank";
import { bankToRep, groupBy, roundRobin } from "./build-stop";
import { allocate, seededRng, shuffle } from "@/core/path/compose";
import { bankRepId } from "@/core/path/rep-id";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { ChoiceRep, RehearsalSize } from "@/core/path/types";

export interface BuildRehearsalInput {
  bank: PathBank;
  size: RehearsalSize;
  /** Rep ids the learner has answered before. */
  seen: readonly string[];
  seed: number;
}

/**
 * Draw an exam rehearsal from the bank: each domain gets its exam weight's
 * share of the questions, ones not seen yet first, spread across the domain's
 * objectives; then they're mixed together, as the exam mixes them. Pure given
 * a bank, so it's tested without a database.
 */
export function buildRehearsal({ bank, size, seen, seed }: BuildRehearsalInput): ChoiceRep[] {
  const rng = seededRng(seed);
  const seenSet = new Set(seen);
  const wanted = REHEARSAL_FORMATS[size].questions;
  const isSeen = (q: BankQuestion) => seenSet.has(bankRepId(q.objective, q.id));
  const spread = (questions: BankQuestion[]) =>
    roundRobin([...groupBy(shuffle(questions, rng), (q) => q.objective).values()]);
  const ranked = (questions: BankQuestion[]) => [
    ...spread(questions.filter((q) => !isSeen(q))),
    ...spread(questions.filter(isSeen)),
  ];

  const domains = bank.structure.domains;
  const slots = allocate(
    domains.map((d) => d.weight),
    wanted
  );
  const picked: BankQuestion[] = [];
  domains.forEach((d, i) => {
    picked.push(...ranked(bank.questions.filter((q) => q.domain === d.number)).slice(0, slots[i]));
  });

  // A domain too thin for its share leaves room: fill it from the rest.
  if (picked.length < wanted) {
    const used = new Set(picked.map((q) => q.id));
    picked.push(...ranked(bank.questions.filter((q) => !used.has(q.id))).slice(0, wanted - picked.length));
  }

  return shuffle(picked, rng).map((q) => bankToRep(q, "exam", rng));
}
