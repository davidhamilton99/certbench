import type { PbqGradeResult } from "@/data/pbq/types";

/**
 * What a page other than the PBQ lab (the guided path) needs from a scenario
 * player: the result once it's graded, and its own words for the way out.
 */
export interface PbqHostProps {
  /** Called with the result each time the scenario is graded. */
  onGraded?: (result: PbqGradeResult) => void;
  /** In place of "Back to scenarios". */
  backLabel?: string;
}
