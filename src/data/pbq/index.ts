import type { PbqScenario } from "./types";
import { securityPlusScenarios } from "./security-plus-sy0-701";

/**
 * Registry mapping cert slugs to PBQ scenario arrays.
 * Add new certs here as scenario data files are created.
 */
export const pbqRegistry: Record<string, PbqScenario[]> = {
  "security-plus-sy0-701": securityPlusScenarios,
};
