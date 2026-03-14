import { aPlusCore1Scenarios as drills } from "./scenarios";
import { aPlusCore1Simulations } from "./simulations";
import type { PbqScenario } from "../types";

export const aPlusCore1Scenarios: PbqScenario[] = [...drills, ...aPlusCore1Simulations];
