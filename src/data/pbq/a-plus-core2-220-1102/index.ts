import { aPlusCore2Scenarios as drills } from "./scenarios";
import { aPlusCore2Simulations } from "./simulations";
import { aPlusCore2ThreatHunts } from "./threat-hunts";
import type { PbqScenario } from "../types";

export const aPlusCore2Scenarios: PbqScenario[] = [
  ...aPlusCore2ThreatHunts,
  ...drills,
  ...aPlusCore2Simulations,
];
