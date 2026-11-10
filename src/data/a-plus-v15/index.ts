import { parseRepId } from "@/core/path/rep-id";
import type { PathProgress, StopRecord } from "@/core/path/types";
import type { ItemRecord } from "@/core/drill-rounds/drill-rounds";
import { CORE1_V15 } from "./core1";
import { CORE2_V15 } from "./core2";
import type { V15Exam } from "./types";

export { CORE1_V15, CORE2_V15 };
export type { V15Exam } from "./types";

/** Both A+ cores on V15, Core 1 first. */
export const A_PLUS_V15: readonly V15Exam[] = [CORE1_V15, CORE2_V15];

/** The V15 objective codes of an exam, in order. */
export function v15Codes(exam: V15Exam): string[] {
  return exam.domains.flatMap((d) => d.objectives.map((o) => o.code));
}

/**
 * The V15 objective a 220-1101/1102 question belongs to now: its override, or
 * its old objective's mapping. Null when the question is retired or its topic
 * left the exam.
 */
export function v15ObjectiveOf(exam: V15Exam, questionId: string, oldCode: string): string | null {
  if (questionId in exam.retired) return null;
  return exam.overrides[questionId]?.to ?? exam.objectiveMap[oldCode] ?? null;
}

const LEARN_STOP = /^\d+\.\d+$/;

// Two old records landing on one V15 key keep the more recent.
const laterItem = (a: ItemRecord | undefined, b: ItemRecord) => (a && a.t > b.t ? a : b);
const laterStop = (a: StopRecord | undefined, b: StopRecord) => (a && a.at > b.at ? a : b);

/**
 * Carry a learner's 220-1101/1102 path over to V15. Answers keep their records
 * under their question's (or recall deck's) V15 objective, and a finished learn
 * stop counts as its objective's V15 stop. Answers on retired questions and
 * topics that left the exam are dropped. A lab stop whose domain now closes
 * with another scenario counts only if they've played that one. Everything
 * else (practice stops, checkpoint, rehearsals, labs, goal) is unchanged,
 * because domains keep their numbers.
 */
export function migrateAPlusV14Progress(progress: PathProgress, exam: V15Exam): PathProgress {
  const items: Record<string, ItemRecord> = {};
  for (const [id, record] of Object.entries(progress.items)) {
    const parsed = parseRepId(id);
    if (!parsed) {
      items[id] = laterItem(items[id], record);
      continue;
    }
    const deck = parsed.source === "r" ? parsed.key.split("|")[0] : null;
    const to =
      parsed.source === "q"
        ? v15ObjectiveOf(exam, parsed.key, parsed.objective)
        : deck !== null && deck in exam.recallDecks
          ? exam.recallDecks[deck]
          : (exam.objectiveMap[parsed.objective] ?? null);
    if (to === null) continue;
    const next = `${parsed.source}|${to}|${parsed.key}`;
    items[next] = laterItem(items[next], record);
  }

  const stops: Record<string, StopRecord> = {};
  for (const [id, record] of Object.entries(progress.stops)) {
    const to = LEARN_STOP.test(id) ? (exam.objectiveMap[id] ?? null) : id;
    if (to === null) continue;
    stops[to] = laterStop(stops[to], record);
  }
  for (const [stop, scenario] of Object.entries(exam.changedLabs)) {
    delete stops[stop];
    const played = progress.labs[scenario];
    if (played) stops[stop] = played;
  }

  return { ...progress, items, stops };
}
