/**
 * What CompTIA says about exam versions, in one place so pages can't drift.
 * Checked against CompTIA's exam pages on the date below. The wording on the
 * pages ("lists its launch as on or around") is chosen to stay true after a
 * date passes, but re-check these when one does.
 */
export const EXAM_FACTS_CHECKED = "November 2, 2026";
export const EXAM_FACTS_CHECKED_ISO = "2026-11-02";

export const COMPTIA_URLS = {
  securityV7: "https://www.comptia.org/en-us/certifications/security/v7/",
  securityV8: "https://www.comptia.org/en-us/certifications/security/v8/",
  securityValidity:
    "https://www.comptia.org/en-us/blog/how-long-does-the-comptia-security-certification-last/",
  aPlusCore1: "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
  aPlusCore2: "https://www.comptia.org/en-us/certifications/a/core-2-v15/",
};

export const MESSER_COMPARISON_URLS = {
  core1:
    "https://www.professormesser.com/free-a-plus-training/a-plus-articles/differences-between-220-1101-and-220-1201/",
  core2:
    "https://www.professormesser.com/free-a-plus-training/a-plus-articles/differences-between-220-1102-and-220-1202/",
};

export const SECURITY_PLUS_VERSIONS_PATH = "/security-plus-sy0-801-vs-sy0-701";

export const SECURITY_PLUS_CERT = "security-plus-sy0-701";
export const NETWORK_PLUS_CERT = "network-plus-n10-009";
export const A_PLUS_CORE1_CERT = "a-plus-core1-220-1101";
export const A_PLUS_CORE2_CERT = "a-plus-core2-220-1102";

/** Exam code that replaced a retired one, by the cert slug our content is written to. */
const REPLACED_BY: Record<string, string> = {
  [A_PLUS_CORE1_CERT]: "220-1201",
  [A_PLUS_CORE2_CERT]: "220-1202",
};

/** The exam that replaced this cert's, or null while its exam is still open. */
export function replacedBy(certSlug: string): string | null {
  return REPLACED_BY[certSlug] ?? null;
}

/**
 * The database's Network+ objectives don't follow CompTIA's N10-009 list: its
 * 1.4 is subnetting, CompTIA's 1.4 is ports, and CompTIA has no 4.4 or 4.5. Until
 * they're re-mapped, Network+ pages name the topic and never cite a number or
 * domain as CompTIA's.
 */
export function usesOfficialObjectiveNumbers(certSlug: string): boolean {
  return certSlug !== NETWORK_PLUS_CERT;
}

/** Certs with an exam-objectives index page: live exam, objectives match CompTIA's list. */
export const OBJECTIVE_HUB_CERTS: string[] = [SECURITY_PLUS_CERT];

export interface SecurityDomainChange {
  name: string;
  sy0701: number;
  sy0801: number;
}

/** Domain weights from CompTIA's SY0-701 and SY0-801 exam pages. */
export const SECURITY_PLUS_DOMAIN_CHANGES: SecurityDomainChange[] = [
  { name: "General security concepts", sy0701: 12, sy0801: 16 },
  { name: "Threats, vulnerabilities, and mitigations (attacks on SY0-801)", sy0701: 22, sy0801: 24 },
  { name: "Security architecture", sy0701: 18, sy0801: 19 },
  { name: "Security operations", sy0701: 28, sy0801: 27 },
  { name: "Security program management and oversight", sy0701: 20, sy0801: 14 },
];
