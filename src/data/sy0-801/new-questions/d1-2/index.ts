import type { CoverageItem, NewQuestion } from "./types";
import { questions as domain1 } from "./domain-1";
import { questions as domain2 } from "./domain-2";

export type { CoverageItem, NewQuestion } from "./types";

/**
 * New Security+ SY0-801 bank questions for domains 1 and 2: every AI threat
 * 2.6 names, enough on 2.1 to bring it to 20 with the questions carried from
 * SY0-701, and a question on each topic SY0-801 names in 1.2 to 2.5 that the
 * carried bank has none on, or mentions only in passing.
 *
 * Topics come from CompTIA's SY0-801 exam objectives (document version 2.0),
 * compared with the SY0-701 bank snapshot in src/data/sy0-801. Facts were
 * checked against primary sources: FIRST's CVSS v4.0 specification and EPSS
 * page, CISA's KEV catalog, MITRE's CWE pages, the CVE Program's CNA rules, RFC
 * 9525 (wildcards), RFC 6143 (VNC), NIST's roots of trust project, Microsoft's
 * documentation and threat intelligence posts (transparent data encryption,
 * ClickFix, Teams help desk impersonation), AWS's EBS encryption guide, the
 * OWASP Top 10 for LLM Applications 2025 and AI Exchange, the Model Context
 * Protocol's security best practices, and Python's pickle documentation.
 *
 * None of them reuses a scenario from the 59 free SY0-801 questions (the
 * practice test and the AI page), so a paid rehearsal never repeats a free one.
 */
export const SY0_801_NEW_QUESTIONS_D1_2: NewQuestion[] = [...domain1, ...domain2];

/** The topics these questions cover, by SY0-801 objective. */
export const COVERAGE: CoverageItem[] = [
  // Named in SY0-801 with no question in the carried bank.
  { objective: "1.2", topic: "backout planning" },
  { objective: "1.2", topic: "fail forward" },
  { objective: "1.2", topic: "restricted activities" },
  { objective: "1.2", topic: "service restart" },
  { objective: "1.2", topic: "application restart" },
  { objective: "1.3", topic: "root of trust" },
  { objective: "1.3", topic: "wildcard certificates" },
  { objective: "1.3", topic: "partition encryption" },
  { objective: "1.3", topic: "volume encryption" },
  { objective: "1.3", topic: "database encryption" },
  { objective: "1.3", topic: "record encryption" },

  // 2.1 carries only 6 questions from SY0-701 (CVSS metrics, the NVD,
  // weaponization speed, risk-based prioritization); these bring it to 20+.
  { objective: "2.1", topic: "threat feeds" },
  { objective: "2.1", topic: "intelligence sources" },
  { objective: "2.1", topic: "likelihood and impact" },
  { objective: "2.1", topic: "threat life cycle" },
  { objective: "2.1", topic: "CVSS scoring" },
  { objective: "2.1", topic: "prioritization" },
  { objective: "2.1", topic: "vulnerability types (CWE)" },
  { objective: "2.1", topic: "CVE" },

  // Named in SY0-801 with no question in the carried bank.
  { objective: "2.2", topic: "terrorists" },
  { objective: "2.3", topic: "RCS" },
  { objective: "2.3", topic: "QR codes" },
  { objective: "2.3", topic: "RTF documents" },
  { objective: "2.3", topic: "VNC" },
  { objective: "2.3", topic: "logistics providers" },
  { objective: "2.3", topic: "lock and key" },
  { objective: "2.3", topic: "NFC" },
  { objective: "2.4", topic: "low-power communications" },
  { objective: "2.4", topic: "LLMs as an attack surface" },
  { objective: "2.5", topic: "quishing" },
  { objective: "2.5", topic: "sniffing" },
  { objective: "2.5", topic: "forced entry" },
  { objective: "2.5", topic: "plaintext strings" },
  { objective: "2.5", topic: "concurrent sessions" },

  // Named in SY0-801, and the carried bank mentions them only in passing, if at all.
  { objective: "2.3", topic: "CAPTCHA" },
  { objective: "2.3", topic: "collaboration tools" },
  { objective: "2.5", topic: "deepfakes" },
  { objective: "2.5", topic: "MFA bypass" },
  { objective: "2.5", topic: "fileless malware" },

  // 2.6 is new in SY0-801 and carries nothing: its 13 topics, in the document's order.
  { objective: "2.6", topic: "model manipulation" },
  { objective: "2.6", topic: "poisoning" },
  { objective: "2.6", topic: "prompt injection" },
  { objective: "2.6", topic: "data loss" },
  { objective: "2.6", topic: "bias" },
  { objective: "2.6", topic: "explainability" },
  { objective: "2.6", topic: "hallucinations" },
  { objective: "2.6", topic: "jailbreaking" },
  { objective: "2.6", topic: "evasion" },
  { objective: "2.6", topic: "privacy" },
  { objective: "2.6", topic: "ethical considerations" },
  { objective: "2.6", topic: "session hijacking" },
  { objective: "2.6", topic: "code execution" },
];
