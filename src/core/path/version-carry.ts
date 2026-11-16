import type { ItemMap, ItemRecord } from "@/core/drill-rounds/drill-rounds";
import { authoredRepId, bankRepId, parseRepId } from "./rep-id";
import { EMPTY_PATH_PROGRESS, type PathProgress, type StopRecord } from "./types";

/** How one exam version's answers become the next version's (Security+ SY0-701 to SY0-801). */
export interface VersionMapping {
  /** Earlier version's question id → [the newer version's copy of it, the copy's objective]. */
  questions: Readonly<Record<string, readonly [string, string]>>;
  /** Hand-written rep key → its objective on the newer version, for reps carried word for word. */
  reps: Readonly<Record<string, string>>;
  /** Lab scenarios the newer version plays in a version of its own, so their records stay behind. */
  replacedLabs: Readonly<Record<string, string>>;
}

export interface CarriedProgress {
  progress: PathProgress;
  /** Answers carried: bank questions and hand-written reps. */
  answers: number;
  labs: number;
}

// Two records landing on one key keep the one with more answers, then the later.
const better = (a: ItemRecord | undefined, b: ItemRecord) => (!a || b.a > a.a || (b.a === a.a && b.t > a.t) ? b : a);

/**
 * What a learner takes from one exam version's path to the next, the first
 * time they open it. Their answers carry, so the map shows what they know and
 * their misses come back in review: a bank question's answer moves to the
 * question's copy, a hand-written rep's to the same rep wherever the newer
 * version files it, and a lab's record to the same lab. Finished stops, the
 * checkpoint and rehearsals don't: the newer version's stops are different, so
 * its map is earned again. Their exam goal comes along. Reps reworded or
 * dropped for the newer version, and questions it doesn't copy, stay behind.
 */
export function carryProgress(from: PathProgress, m: VersionMapping): CarriedProgress {
  const items: ItemMap = {};
  for (const [id, record] of Object.entries(from.items)) {
    const parsed = parseRepId(id);
    if (!parsed) continue;
    let next: string | null = null;
    if (parsed.source === "q") {
      const copy = m.questions[parsed.key];
      if (copy) next = bankRepId(copy[1], copy[0]);
    } else if (parsed.source === "a") {
      const objective = m.reps[parsed.key];
      if (objective) next = authoredRepId(objective, parsed.key);
    }
    if (next) items[next] = better(items[next], record);
  }

  const labs: Record<string, StopRecord> = {};
  for (const [scenario, record] of Object.entries(from.labs)) {
    if (!(scenario in m.replacedLabs)) labs[scenario] = record;
  }

  return {
    progress: { ...EMPTY_PATH_PROGRESS, items, labs, goal: from.goal },
    answers: Object.keys(items).length,
    labs: Object.keys(labs).length,
  };
}
