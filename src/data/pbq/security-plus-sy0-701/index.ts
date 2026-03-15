import { securityPlusScenarios as drills } from "./scenarios";
import { securityPlusSimulations } from "./simulations";
import { securityPlusTopologies } from "./topologies";
import type { PbqScenario } from "../types";

export const securityPlusScenarios: PbqScenario[] = [
  ...drills,
  ...securityPlusSimulations,
  ...securityPlusTopologies,
];
