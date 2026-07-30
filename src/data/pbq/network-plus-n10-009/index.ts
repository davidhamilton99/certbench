import { networkPlusScenarios as drills } from "./scenarios";
import { networkPlusSimulations } from "./simulations";
import { networkPlusTopologies } from "./topologies";
import { networkPlusThreatHunts } from "./threat-hunts";
import type { PbqScenario } from "../types";

export const networkPlusScenarios: PbqScenario[] = [
  ...networkPlusThreatHunts,
  ...drills,
  ...networkPlusSimulations,
  ...networkPlusTopologies,
];
