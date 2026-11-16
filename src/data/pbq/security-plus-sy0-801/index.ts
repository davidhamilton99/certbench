import type { PbqScenario } from "../types";
import { securityPlusScenarios } from "../security-plus-sy0-701";
// Relative, like the map's own imports, so scripts can load this outside Next.
import { SY0_801_MAP } from "../../sy0-801/map";
import { aiThreatHunt } from "./ai-threat-hunt";
import { incidentResponseProcess } from "./incident-response-process";

const OWN: Record<string, PbqScenario> = {
  [incidentResponseProcess.id]: incidentResponseProcess,
};
const domainTitle = new Map(SY0_801_MAP.domains.map((d) => [d.number, d.title]));

/**
 * Security+ SY0-801's labs: every SY0-701 lab, filed in its SY0-801 domain
 * (the map's labDomains), with SY0-801's own version wherever the map replaces
 * one, plus the AI threat hunt SY0-801 adds for objective 2.6. Each domain's
 * closing lab is the map's closingLabs pick where it names one.
 */
export const securityPlus801Scenarios: PbqScenario[] = [
  aiThreatHunt,
  ...securityPlusScenarios.map((s): PbqScenario => {
    const own = SY0_801_MAP.replacedLabs[s.id];
    if (own) return OWN[own];
    // SY0-801's domain names too: domain 2 is "…and Attacks" there, "…and Mitigations" on SY0-701.
    const domain = SY0_801_MAP.labDomains[s.id] ?? s.domain_number;
    return { ...s, domain_number: domain, domain_title: domainTitle.get(domain) ?? s.domain_title };
  }),
];

/** SY0-801's closing lab per domain, where the default pick isn't it. */
export const securityPlus801ClosingLabs: Readonly<Record<string, string>> = SY0_801_MAP.closingLabs;
