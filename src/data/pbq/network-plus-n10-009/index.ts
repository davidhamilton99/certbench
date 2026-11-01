import { networkPlusScenarios as drills } from "./scenarios";
import { networkPlusSimulations } from "./simulations";
import { networkPlusTopologies } from "./topologies";
import { networkPlusTerminals } from "./terminals";
import type { PbqScenario } from "../types";

export const networkPlusScenarios: PbqScenario[] = [
  ...networkPlusTerminals,
  ...drills,
  ...networkPlusSimulations,
  ...networkPlusTopologies,
];
