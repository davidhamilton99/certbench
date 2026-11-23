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

/**
 * Each kind of lab: its name and icon. A topology lab is called a network
 * diagram, the name the public lab pages, help and the educators' page use.
 */
export const LAB_TYPES: Record<LabType, { label: string; Icon: LucideIcon }> = {
  simulation: { label: "Simulation", Icon: SquareTerminal },
  topology: { label: "Network diagram", Icon: Network },
  "threat-hunt": { label: "Threat hunt", Icon: Radar },
  ordering: { label: "Ordering drill", Icon: ListOrdered },
  matching: { label: "Matching drill", Icon: ArrowLeftRight },
  categorization: { label: "Sorting drill", Icon: Columns3 },
};

/** The hands-on kinds, which work like the exam's PBQs; the rest are quick drills. */
export const HANDS_ON_TYPES: ReadonlySet<LabType> = new Set(["simulation", "topology", "threat-hunt"]);

const HANDS_ON_NAMES: [LabType, string][] = [
  ["simulation", "simulations"],
  ["topology", "network diagrams"],
  ["threat-hunt", "threat hunts"],
];

/** "7 simulations and network diagrams": the hands-on labs in a list, by the kinds it has. */
export function handsOnCount(labs: readonly Pick<PathLabInfo, "type">[]): string {
  const handsOn = labs.filter((l) => HANDS_ON_TYPES.has(l.type));
  // One lab is named in the singular, by its kind's own name: "1 simulation".
  if (handsOn.length === 1) return `1 ${LAB_TYPES[handsOn[0].type].label.toLowerCase()}`;
  const names = HANDS_ON_NAMES.filter(([type]) => handsOn.some((l) => l.type === type)).map(([, name]) => name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "labs");
  return `${handsOn.length} ${list}`;
}

/** "Simulation, 12 minutes", for a lab's line. */
export const labMeta = (lab: Pick<PathLabInfo, "type" | "minutes">) =>
  `${LAB_TYPES[lab.type].label}, ${lab.minutes} ${lab.minutes === 1 ? "minute" : "minutes"}`;

/** "3.0" → "3". */
export const domainLabel = (number: string) => number.replace(/\.0$/, "");
