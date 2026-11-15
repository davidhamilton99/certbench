import {
  ArrowLeftRight,
  Columns3,
  ListOrdered,
  Network,
  Radar,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";
import type { LabType, PathLabInfo } from "@/core/path/types";

/**
 * How labs are named and drawn wherever they're listed: the path's lab
 * library and the public PBQ pages. No "use client", so a server page can
 * read it too.
 */

/** Each kind of lab: its name and icon. */
export const LAB_TYPES: Record<LabType, { label: string; Icon: LucideIcon }> = {
  simulation: { label: "Simulation", Icon: SquareTerminal },
  topology: { label: "Topology", Icon: Network },
  "threat-hunt": { label: "Threat hunt", Icon: Radar },
  ordering: { label: "Ordering drill", Icon: ListOrdered },
  matching: { label: "Matching drill", Icon: ArrowLeftRight },
  categorization: { label: "Sorting drill", Icon: Columns3 },
};

/** The hands-on kinds, which work like the exam's PBQs; the rest are quick drills. */
export const HANDS_ON_TYPES: ReadonlySet<LabType> = new Set(["simulation", "topology", "threat-hunt"]);

const HANDS_ON_NAMES: [LabType, string][] = [
  ["simulation", "simulations"],
  ["topology", "topologies"],
  ["threat-hunt", "threat hunts"],
];

/** "7 simulations and topologies": the hands-on labs in a list, by the kinds it has. */
export function handsOnCount(labs: readonly Pick<PathLabInfo, "type">[]): string {
  const handsOn = labs.filter((l) => HANDS_ON_TYPES.has(l.type));
  const names = HANDS_ON_NAMES.filter(([type]) => handsOn.some((l) => l.type === type)).map(([, name]) => name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "labs");
  return `${handsOn.length} ${list}`;
}

/** "Simulation · 12 min", for a lab's line. */
export const labMeta = (lab: Pick<PathLabInfo, "type" | "minutes">) => `${LAB_TYPES[lab.type].label} · ${lab.minutes} min`;

/** "3.0" → "3". */
export const domainLabel = (number: string) => number.replace(/\.0$/, "");
