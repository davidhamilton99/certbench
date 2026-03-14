import { securityPlusScenarios as drills } from "./scenarios";
import { securityPlusSimulations } from "./simulations";
import type { PbqScenario } from "../types";

export const securityPlusScenarios: PbqScenario[] = [...drills, ...securityPlusSimulations];
