import type { CoverageItem, NewQuestion } from "./types";
import { questions as domain3 } from "./domain-3";
import { questions as domain4 } from "./domain-4";
import { questions as domain5 } from "./domain-5";

export type { CoverageItem, NewQuestion } from "./types";

/**
 * New Security+ SY0-801 bank questions for domains 3 to 5: the topics
 * SY0-801's objectives (CompTIA's exam objectives document, version 2.0) name
 * that the carried SY0-701 bank has no question on, or mentions only in
 * passing, plus top-ups that bring 4.3, 4.4 and 5.1 to at least 20 questions
 * each with the carried bank (src/data/sy0-801).
 *
 * They're kept apart from the 59 free SY0-801 questions (the practice test in
 * security-plus-v8-practice-test.ts and the AI questions in
 * security-plus-v8.ts), with no shared scenarios, so a paid rehearsal never
 * repeats one someone already took for free. The SY0-801 migration builder
 * will read this export; domains 1 and 2 get their own set in ../d1-2.
 */
export const SY0_801_NEW_QUESTIONS_D3_5: NewQuestion[] = [...domain3, ...domain4, ...domain5];

/** The topics these questions cover, under their SY0-801 objectives. Every one has a question. */
export const COVERAGE: CoverageItem[] = [
  // 3.1 Architecture models: technical and business considerations the bank has no question on.
  { objective: "3.1", topic: "usability" },
  { objective: "3.1", topic: "environmental requirements" },
  // 3.2 Managing security architecture. SSE, end-to-end encrypted messaging and
  // diversity had only passing mentions (SSE through three CASB questions).
  { objective: "3.2", topic: "group Managed Service Accounts (gMSAs)" },
  { objective: "3.2", topic: "Security Service Edge (SSE)" },
  { objective: "3.2", topic: "end-to-end encrypted messaging" },
  { objective: "3.2", topic: "diversity" },
  // 3.3 Protecting data. Data stewards and the life cycle had only passing mentions.
  { objective: "3.3", topic: "structured vs. unstructured data" },
  { objective: "3.3", topic: "data transpose" },
  { objective: "3.3", topic: "filtering" },
  { objective: "3.3", topic: "data operator" },
  { objective: "3.3", topic: "geofencing" },
  { objective: "3.3", topic: "data steward" },
  { objective: "3.3", topic: "data management life cycle" },
  // 3.4 Resilience and recovery.
  { objective: "3.4", topic: "redundant power supply (RPS)" },
  // 4.1 Mitigating controls. Canary accounts, captive portals and rate limiting
  // had only passing mentions.
  { objective: "4.1", topic: "wireless intrusion prevention system (WIPS)" },
  { objective: "4.1", topic: "unified threat management (UTM)" },
  { objective: "4.1", topic: "secrets scanning" },
  { objective: "4.1", topic: "Brand Indicators for Message Identification (BIMI)" },
  { objective: "4.1", topic: "extended detection and response (XDR)" },
  { objective: "4.1", topic: "canary accounts" },
  { objective: "4.1", topic: "captive portals" },
  { objective: "4.1", topic: "rate-limiting requests" },
  // 4.3 Vulnerability management: the carried bank leaves it at 12.
  { objective: "4.3", topic: "IP address management (IPAM)" },
  { objective: "4.3", topic: "cloud security posture management (CSPM)" },
  { objective: "4.3", topic: "source code review" },
  { objective: "4.3", topic: "penetration test report review" },
  { objective: "4.3", topic: "responsible disclosure" },
  { objective: "4.3", topic: "bug bounty programs" },
  { objective: "4.3", topic: "verification" },
  { objective: "4.3", topic: "internal and external reporting" },
  // 4.4 Alerting and monitoring: the carried bank leaves it at 12.
  { objective: "4.4", topic: "network management systems" },
  { objective: "4.4", topic: "packet analyzers" },
  { objective: "4.4", topic: "Security Content Automation Protocol (SCAP)" },
  { objective: "4.4", topic: "syslog" },
  { objective: "4.4", topic: "port mirroring" },
  { objective: "4.4", topic: "dashboards" },
  { objective: "4.4", topic: "agents vs. agentless" },
  { objective: "4.4", topic: "benchmarks" },
  { objective: "4.4", topic: "alert tuning" },
  // 4.5 Identity and access management. Passwordless and time-based access had
  // only passing mentions.
  { objective: "4.5", topic: "passkeys" },
  { objective: "4.5", topic: "backup codes" },
  { objective: "4.5", topic: "passwordless" },
  { objective: "4.5", topic: "time-based access" },
  // 4.6 Automation, orchestration and AI: the AI capabilities.
  { objective: "4.6", topic: "agentic AI" },
  { objective: "4.6", topic: "chatbots" },
  { objective: "4.6", topic: "predictive analysis" },
  { objective: "4.6", topic: "AI-augmented baselines" },
  // 4.7 Incident response. Negotiation and advisories had only passing mentions.
  { objective: "4.7", topic: "post-incident reporting" },
  { objective: "4.7", topic: "negotiation" },
  { objective: "4.7", topic: "internal and external advisories" },
  // 4.8 Investigation data. IPFIX, memory dumps and log parsing had only passing mentions.
  { objective: "4.8", topic: "bit-level copies" },
  { objective: "4.8", topic: "IP Flow Information Export (IPFIX)" },
  { objective: "4.8", topic: "memory dumps" },
  { objective: "4.8", topic: "log parsing" },
  // 5.1 Governance, risk and compliance artifacts: the carried bank leaves it at 16.
  { objective: "5.1", topic: "Request for Comments (RFC)" },
  { objective: "5.1", topic: "runbooks" },
  { objective: "5.1", topic: "clean desk policy" },
  { objective: "5.1", topic: "reference architecture" },
  { objective: "5.1", topic: "implementation guides" },
  { objective: "5.1", topic: "BYOD policy" },
  { objective: "5.1", topic: "vulnerability disclosure policy" },
  { objective: "5.1", topic: "data classification and retention policy" },
  // 5.3 Third-party risk. Vendor lock-in had only a passing mention.
  { objective: "5.3", topic: "RFP, RFI, RFQ and EOI" },
  { objective: "5.3", topic: "service-level objectives (SLOs)" },
  { objective: "5.3", topic: "vendor registry" },
  { objective: "5.3", topic: "vendor lock-in" },
  // 5.4 Security compliance. Opt-in and opt-out, data correction and legal
  // orders had only passing mentions.
  { objective: "5.4", topic: "anti-money laundering and counter-terrorism financing (AML/CTF)" },
  { objective: "5.4", topic: "anti-bribery" },
  { objective: "5.4", topic: "processing restrictions and prevention" },
  { objective: "5.4", topic: "opt-in and opt-out" },
  { objective: "5.4", topic: "data correction" },
  { objective: "5.4", topic: "legal orders" },
  // 5.5 Audits and assessments. ATT&CK, the Cyber Kill Chain and sampling had
  // only passing mentions.
  { objective: "5.5", topic: "Diamond Model of Intrusion Analysis" },
  { objective: "5.5", topic: "audit charter" },
  { objective: "5.5", topic: "benchmarking" },
  { objective: "5.5", topic: "functional vs. behavioral testing" },
  { objective: "5.5", topic: "MITRE ATT&CK" },
  { objective: "5.5", topic: "Cyber Kill Chain" },
  { objective: "5.5", topic: "sampling" },
  // 5.6 Security awareness. Behavior risk scoring had only a passing mention.
  { objective: "5.6", topic: "learning management system (LMS)" },
  { objective: "5.6", topic: "delivery mechanisms" },
  { objective: "5.6", topic: "personnel behavior risk scoring" },
];
