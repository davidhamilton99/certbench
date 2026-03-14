import { networkPlusScenarios as drills } from "./scenarios";
import { networkPlusSimulations } from "./simulations";
import type { PbqScenario } from "../types";

export const networkPlusScenarios: PbqScenario[] = [...drills, ...networkPlusSimulations];
