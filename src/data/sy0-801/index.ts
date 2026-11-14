import { SY0_801_MAP } from "./map";
import type { Sy0801Map } from "./types";

export { SY0_801_MAP };
export type { Sy0801Map, V8MapDomain, V8MapObjective, V8QuestionFix } from "./types";

/** SY0-801's objective codes, in order. */
export function sy0801Codes(map: Sy0801Map = SY0_801_MAP): string[] {
  return map.domains.flatMap((d) => d.objectives.map((o) => o.code));
}

/**
 * The SY0-801 objective an SY0-701 question's copy belongs to: its override, or
 * its objective's mapping. Null when the question isn't copied (retired), or
 * when its SY0-701 code is one the map doesn't know.
 */
export function sy0801ObjectiveOf(questionId: string, sourceCode: string, map: Sy0801Map = SY0_801_MAP): string | null {
  if (questionId in map.retired) return null;
  return map.overrides[questionId]?.to ?? map.objectiveMap[sourceCode] ?? null;
}

/** How many copied questions each SY0-801 objective gets from a bank snapshot of [id, SY0-701 code] rows. */
export function carriedCounts(
  bank: readonly (readonly [string, string])[],
  map: Sy0801Map = SY0_801_MAP
): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(sy0801Codes(map).map((c) => [c, 0]));
  for (const [id, code] of bank) {
    const to = sy0801ObjectiveOf(id, code, map);
    if (to !== null && to in out) out[to]++;
  }
  return out;
}
