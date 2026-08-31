/**
 * Per-viewer Recall mastery, persisted in localStorage. Mastery is coverage:
 * the set of item ids you currently answer correctly, per deck (keyed by the
 * deck's table id). Getting an item right adds it; missing it drops it, so the
 * meter reflects real current command, not a lifetime high-water mark.
 *
 * Everything is wrapped in try/catch — localStorage throws in private mode and
 * some embedded contexts, and a study aid must never break the page.
 */

const STORAGE_PREFIX = "recall-mastery:v1:";

/** tableId -> mastered item ids. */
export type MasteryMap = Record<string, string[]>;

/**
 * Immutably record one answer: a correct answer adds the item to its deck's
 * mastered set, a miss drops it, so the map always reflects current command.
 */
export function applyMastery(
  map: MasteryMap,
  tableId: string,
  itemId: string,
  correct: boolean
): MasteryMap {
  const owned = new Set(map[tableId] ?? []);
  if (correct) owned.add(itemId);
  else owned.delete(itemId);
  return { ...map, [tableId]: [...owned] };
}

/** Mastered / total counts across decks, each capped at its item count. */
export function masteryTotals(
  decks: ReadonlyArray<{ tableId: string; itemCount: number }>,
  map: MasteryMap
): { mastered: number; total: number } {
  let mastered = 0;
  let total = 0;
  for (const d of decks) {
    total += d.itemCount;
    mastered += Math.min(d.itemCount, map[d.tableId]?.length ?? 0);
  }
  return { mastered, total };
}

export function readMastery(certSlug: string): MasteryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + certSlug);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as MasteryMap;
    }
  } catch {
    /* private mode, quota, or malformed data — start fresh */
  }
  return {};
}

export function writeMastery(certSlug: string, map: MasteryMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + certSlug, JSON.stringify(map));
  } catch {
    /* ignore — mastery is a convenience, not a source of truth */
  }
}
