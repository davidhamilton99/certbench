import { securityPlusScenarios as drills } from "./scenarios";
import { securityPlusSimulations } from "./simulations";
import { securityPlusTopologies } from "./topologies";
import { securityPlusThreatHunts } from "./threat-hunts";
import { securityPlusTerminals } from "./terminals";
import type { PbqScenario } from "../types";

export const securityPlusScenarios: PbqScenario[] = [
  ...securityPlusTerminals,
  ...securityPlusThreatHunts,
  ...drills,
  ...securityPlusSimulations,
  ...securityPlusTopologies,
];
