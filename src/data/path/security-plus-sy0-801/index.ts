import type { PathContent } from "../index";
import { warmup } from "./warmup";
import { domain1 } from "./domain-1";
import { domain2 } from "./domain-2";
import { domain3 } from "./domain-3";
import { domain4 } from "./domain-4";
import { domain5 } from "./domain-5";

/**
 * Security+ SY0-801's hand-written path content: the warm-up and a learn stop
 * for each of its 27 objectives, checked against CompTIA's SY0-801 exam
 * objectives (document version 2.0) and written in our own words.
 *
 * It is in PATH_CONTENT (src/data/path/index.ts) beside SY0-701.
 *
 * Keys: a rep whose key is one of SY0-701's (1.1a, 2.2e, w3…) is that SY0-701
 * rep, carried over, often to a different objective. So a learner who switches
 * can take their answers along by key. Those keys name SY0-701's objective
 * numbers, not SY0-801's. New reps have word keys. A test accounts for every
 * SY0-701 rep: carried, reworded (below) or dropped (below).
 */
export const SY0_801_PATH_CONTENT: PathContent = {
  authored: [...domain1, ...domain2, ...domain3, ...domain4, ...domain5],
  warmup: { authored: warmup },
  recallTables: {},
};

/** SY0-701 reps that carry over with a new prompt or answer, by key: what changed. */
export const SY0_701_REWORDED: Record<string, string> = {
  "1.1f": "The answer is SY0-801's control type name, deterring; SY0-701 said deterrent.",
  "2.1a": "The answer is SY0-801's actor name, state-sponsored, with nation-state in brackets.",
  "2.2e": "The answer and options are SY0-801's vector names: external media-based, not removable device.",
  "2.2f": "The answer is misconfiguration, where SY0-801 files default credentials left in place.",
  "2.5g": "The answer is SY0-801's desired state management. The prompt no longer names Group Policy, which 4.1 teaches as a tool.",
  "3.1c": "The answer is SY0-801's operational technology (OT), not ICS/SCADA.",
  "3.2e": "SY0-801 dropped active and passive device placement, so the rep asks about port mirroring instead.",
  "3.2g": "It asks about SSE, which SY0-801 names: SASE was networking and security together, SSE is the security part.",
  "3.3d": "The answer is intellectual property, SY0-801's data category for trade secrets.",
  "3.3f": "The answer is SY0-801's geofencing, not geographic restriction.",
  "3.3g": "The answer is SY0-801's health data category, not regulated data.",
  "4.1a": "SY0-801 drops mobile deployment models, so it asks about the BYOD policy (5.1) instead.",
  "4.3g": "It asks for the risk treatment, accepting (5.2), instead of an exception.",
  "4.7c": "The answer is SY0-801's ticket management, not ticketing and escalation.",
  "4.8a": "SY0-801 lists negotiation between containment and eradication, so it asks which phase removes the foothold instead.",
  "4.8f": "SY0-801's phase is post-incident, so it asks what the meeting is (lessons learned), not which phase.",
  "5.1b": "PR 1's SY0-801 copy of the bank calls a phishing email's exact steps a runbook, so this asks about a playbook as the prepared response to an incident type (4.7).",
  "5.1g": "The answer is SY0-801's deprovisioning, not offboarding.",
  "5.4c": "SY0-801 lists acknowledgements apart from attestations, and confirming you read a policy is an acknowledgement.",
  "5.6c": "It asks about situational awareness, which SY0-801 names; unintentional behavior is not a SY0-801 topic.",
  "5.6g": "It asks about personnel behavior risk scoring, which SY0-801 names, instead of reporting an insider.",
};

/** SY0-701 reps SY0-801 has no place for, by key: why. */
export const SY0_701_DROPPED: Record<string, string> = {
  w2: "Port 443 gives its warm-up place to an AI rep (w-ai), since AI is what SY0-801 adds.",
  "1.2d": "SY0-801 does not name Zero Trust's control-plane parts, like the policy engine.",
  "3.1f": "SY0-801 does not name real-time operating systems.",
  "3.1g": "SY0-801 does not name software-defined networking.",
  "3.4e": "SY0-801 does not name geographic dispersion.",
  "4.1b": "SY0-801 does not name mobile deployment models like COPE.",
  "4.1c": "SY0-801 does not name Wi-Fi site surveys or heat maps.",
  "4.1d": "SY0-801 does not name WPA3 or its SAE handshake.",
  "4.7e": "SY0-801's automation considerations do not name a single point of failure.",
  "4.7f": "SY0-801's automation considerations do not name technical debt.",
  "5.4f": "SY0-801 does not name a data inventory.",
  "5.4g": "SY0-801 does not name internal and external compliance reporting.",
};
