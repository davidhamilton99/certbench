import { aPlusCore2Scenarios as drills } from "./scenarios";
import { aPlusCore2Simulations } from "./simulations";
import type { PbqScenario } from "../types";

export const aPlusCore2Scenarios: PbqScenario[] = [...drills, ...aPlusCore2Simulations];
