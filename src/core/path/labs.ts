import type { PbqScenario } from "@/data/pbq/types";
import type { PathLab } from "./types";

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

/** The lab for one domain ("1.0"), or undefined when the exam has none for it. */
export function domainLab(scenarios: readonly PbqScenario[], domain: string): PathLab | undefined {
  const mine = scenarios.filter((s) => s.domain_number === domain);
  for (const type of PREFERENCE) {
    const s = mine.find((x) => x.type === type);
    if (s) {
      return {
        id: s.id,
        title: s.title,
        minutes: "estimatedMinutes" in s ? s.estimatedMinutes : DRILL_MINUTES,
      };
    }
  }
  return undefined;
}
