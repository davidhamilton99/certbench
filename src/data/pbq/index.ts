import type { PbqScenario } from "./types";
import { securityPlusScenarios } from "./security-plus-sy0-701";
import { securityPlus801ClosingLabs, securityPlus801Scenarios } from "./security-plus-sy0-801";
import { networkPlusScenarios } from "./network-plus-n10-009";
import { aPlusCore1Scenarios } from "./a-plus-core1-220-1201";
import { aPlusCore2Scenarios } from "./a-plus-core2-220-1202";

/**
 * Registry mapping cert slugs to PBQ scenario arrays.
 * Add new certs here as scenario data files are created.
 */
export const pbqRegistry: Record<string, PbqScenario[]> = {
  "security-plus-sy0-701": securityPlusScenarios,
  "security-plus-sy0-801": securityPlus801Scenarios,
  "network-plus-n10-009": networkPlusScenarios,
  "a-plus-core1-220-1201": aPlusCore1Scenarios,
  "a-plus-core2-220-1202": aPlusCore2Scenarios,
};

/**
 * Domains whose closing lab on the path isn't the default pick (the most
 * hands-on scenario, core/path/labs.ts): cert slug → domain → scenario id.
 */
export const pbqClosingLabs: Record<string, Readonly<Record<string, string>>> = {
  "security-plus-sy0-801": securityPlus801ClosingLabs,
};
