import type { PbqScenario } from "@/data/pbq/types";
import type { PathLab, PathLabInfo } from "./types";

/**
 * Which scenario closes a domain: the most hands-on one it has. Simulations,
 * topologies and threat hunts are what the exam's PBQs feel like; ordering,
 * matching and sorting drills stand in for a domain without one.
 */
const PREFERENCE: readonly PbqScenario["type"][] = [
  "simulation",
  "topology",
  "threat-hunt",
  "ordering",
  "matching",
  "categorization",
];

/** Minutes for the drill types, which don't carry an estimate. */
const DRILL_MINUTES = 3;

/** The hands-on kinds, which work like the exam's PBQs; the rest are quick drills. */
export const HANDS_ON: ReadonlySet<PbqScenario["type"]> = new Set(["simulation", "topology", "threat-hunt"]);

const minutesOf = (s: PbqScenario) => ("estimatedMinutes" in s ? s.estimatedMinutes : DRILL_MINUTES);

/** The lab for one domain ("1.0"), or undefined when the exam has none for it. */
export function domainLab(scenarios: readonly PbqScenario[], domain: string): PathLab | undefined {
  const mine = scenarios.filter((s) => s.domain_number === domain);
  for (const type of PREFERENCE) {
    const s = mine.find((x) => x.type === type);
    if (s) return { id: s.id, title: s.title, minutes: minutesOf(s) };
  }
  return undefined;
}

/**
 * Every lab an exam has, as a list shows it: domain by domain, the hands-on
 * ones first, in the order the exam's data lists them. Titles and lengths
 * only; the scenarios themselves (answers included) load one at a time.
 */
export function labLibrary(scenarios: readonly PbqScenario[]): PathLabInfo[] {
  return scenarios
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        a.s.domain_number.localeCompare(b.s.domain_number, undefined, { numeric: true }) ||
        Number(!HANDS_ON.has(a.s.type)) - Number(!HANDS_ON.has(b.s.type)) ||
        a.i - b.i
    )
    .map(({ s }) => ({ id: s.id, title: s.title, minutes: minutesOf(s), type: s.type, domain: s.domain_number }));
}
