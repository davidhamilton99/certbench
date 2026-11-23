import type { PbqGradeResult, PbqScenario } from "@/data/pbq/types";

/**
 * What a page that hosts a lab (the study path, a public PBQ page, the
 * workspace's lab list) needs from a lab's player: the result once it is
 * graded, its own words for the way out, word of the first move, and whether
 * the lab takes the keyboard's focus as it opens.
 */
export interface PbqHostProps {
  /** Called with the result each time the lab is graded. */
  onGraded?: (result: PbqGradeResult) => void;
  /** In place of "Return to the scenarios". */
  backLabel?: string;
  /**
   * Called once for each lab that is opened, at the first thing the player
   * does in it (the first answer, placement or flagged line). A lab that is
   * only looked at never calls it, and repeating the lab does not call it again.
   */
  onStarted?: () => void;
  /**
   * Take the keyboard's focus on arrival, on the lab's title. True where the
   * lab opens in answer to a press on the same page (a row in a list of labs),
   * so a keyboard and a screen reader start at the lab and not at the top of
   * the page. False for a lab that is on the page as it loads.
   */
  takeFocus?: boolean;
}

/**
 * The three large players. Each is fetched when a lab of its kind is opened,
 * not with the page: most labs a visitor meets first are drills, which need
 * none of them.
 *
 * These are the only places the three are imported from. The player that
 * shows a lab (PbqPlayer) and the early fetch below both go through them, so
 * a fetch started on a hover is the very request the lab then waits for, and
 * never a second copy of the same code.
 */
export const LARGE_PLAYERS = {
  simulation: () => import("@/components/workspace/SimulationPlayer"),
  topology: () => import("@/components/workspace/TopologyPlayer"),
  "threat-hunt": () => import("@/components/workspace/ThreatHuntPlayer"),
} as const;

/**
 * Start fetching the player for a kind of lab before the lab is opened: call
 * it when the lab's row or tile is hovered or takes focus, so the lab is
 * usually there by the time it is pressed. Safe to call any number of times,
 * and for any kind of lab: a drill needs no fetch.
 */
export function preloadLab(type: PbqScenario["type"]): void {
  if (type !== "simulation" && type !== "topology" && type !== "threat-hunt") return;
  // A failed fetch here is not an error to report: opening the lab asks again.
  void LARGE_PLAYERS[type]().catch(() => undefined);
}
