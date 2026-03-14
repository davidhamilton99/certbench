import type { PbqScenario } from "./types";
import { securityPlusScenarios } from "./security-plus-sy0-701";
import { networkPlusScenarios } from "./network-plus-n10-009";
import { aPlusCore1Scenarios } from "./a-plus-core1-220-1101";
import { aPlusCore2Scenarios } from "./a-plus-core2-220-1102";

/**
 * Registry mapping cert slugs to PBQ scenario arrays.
 * Add new certs here as scenario data files are created.
 */
export const pbqRegistry: Record<string, PbqScenario[]> = {
  "security-plus-sy0-701": securityPlusScenarios,
  "network-plus-n10-009": networkPlusScenarios,
  "a-plus-core1-220-1101": aPlusCore1Scenarios,
  "a-plus-core2-220-1102": aPlusCore2Scenarios,
};
