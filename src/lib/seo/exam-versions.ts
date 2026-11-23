/**
 * What CompTIA says about exam versions, in one place so pages can't drift.
 * All five of CompTIA's exam pages (the five addresses in COMPTIA_URLS that
 * are not blog posts) were read on the date below. Each page gave its
 * exam's launch date, question limit (a maximum of 90), time limit (90
 * minutes), passing score and domain weights.
 *
 * Security+ V7 (SY0-701) launched on November 7, 2023 and stays open until
 * June 11, 2027 in English. Security+ V8 (SY0-801) launched on November 17,
 * 2026, and CompTIA's Security+ page calls V8 "the recommended version".
 * Network+ V9 (N10-009) launched on June 20, 2024. A+ Core 1 and Core 2 V15
 * (220-1201 and 220-1202) launched on March 25, 2025. Passing scores: 750 for
 * both Security+ versions and 720 for Network+, each on a scale of 100 to 900;
 * 675 for A+ Core 1 and 700 for A+ Core 2, which CompTIA states on a scale of
 * 900. Re-check these when a date passes.
 *
 * The retirement of the previous A+ series (V14: 220-1101 and 220-1102) on
 * September 25, 2025, and the rule that both A+ exams must come from one
 * series, are not on the exam pages. CompTIA states both in the blog post at
 * COMPTIA_URLS.aPlusSeries, read on the same date: a sentence that gives that
 * date cites that post, and not an exam page.
 */
export const EXAM_FACTS_CHECKED = "November 22, 2026";
export const EXAM_FACTS_CHECKED_ISO = "2026-11-22";

export const COMPTIA_URLS = {
  securityV7: "https://www.comptia.org/en-us/certifications/security/v7/",
  securityV8: "https://www.comptia.org/en-us/certifications/security/v8/",
  securityValidity:
    "https://www.comptia.org/en-us/blog/how-long-does-the-comptia-security-certification-last/",
  networkPlus: "https://www.comptia.org/en-us/certifications/network/",
  aPlusCore1: "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
  aPlusCore2: "https://www.comptia.org/en-us/certifications/a/core-2-v15/",
  /** "CompTIA A+ Has Two Exams": when the V14 series retired, and that both exams must come from one series. */
  aPlusSeries: "https://www.comptia.org/en-us/blog/comptia-a-has-two-exams-what-you-need-to-know/",
};

export const SECURITY_PLUS_VERSIONS_PATH = "/security-plus-sy0-801-vs-sy0-701";
/** SY0-801 itself: the exam, its domains and every objective. */
export const SY0_801_PATH = "/security-plus-sy0-801";
/** Free practice on SY0-801's new AI objective, 2.6. */
export const SY0_801_AI_PATH = "/security-plus-sy0-801-ai-practice-questions";
/** The free SY0-801 practice test: a full-length 90-question exam, plus 45 questions to work one at a time. */
export const SY0_801_PRACTICE_PATH = "/security-plus-sy0-801-practice-test";
/** When the first SY0-801 pages went up. */
export const SY0_801_PUBLISHED_ISO = "2026-11-08";
/** When the SY0-801 pages last changed, for the sitemap and their structured data. */
export const SY0_801_UPDATED_ISO = "2026-11-22";
/** When the practice test went up, and when its questions were checked against CompTIA's SY0-801 objectives. */
export const SY0_801_PRACTICE_PUBLISHED_ISO = "2026-11-14";
export const SY0_801_PRACTICE_CHECKED = "November 14, 2026";

export const SECURITY_PLUS_CERT = "security-plus-sy0-701";
/** Security+ SY0-801's path and exam, beside SY0-701's (src/data/sy0-801). */
export const SY0_801_CERT = "security-plus-sy0-801";

/**
 * Exams whose generated public pages (a page per objective, a readiness check)
 * aren't published yet. Most of SY0-801's questions are copies of SY0-701's,
 * so its pages wait for content of their own rather than repeat SY0-701's.
 */
export const UNPUBLISHED_PAGE_CERTS: readonly string[] = [SY0_801_CERT];
export const NETWORK_PLUS_CERT = "network-plus-n10-009";
export const A_PLUS_CORE1_CERT = "a-plus-core1-220-1201";
export const A_PLUS_CORE2_CERT = "a-plus-core2-220-1202";

/**
 * Exam code that replaced a retired one, by the cert slug our content is
 * written to. Empty while every exam we cover is current: A+ left it when its
 * bank moved to 220-1201/1202.
 */
const REPLACED_BY: Record<string, string> = {};

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
export const OBJECTIVE_HUB_CERTS: string[] = [SECURITY_PLUS_CERT, A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT];

/** CompTIA's page for each exam with a hub, where it publishes the objectives. */
export const COMPTIA_EXAM_PAGES: Record<string, string> = {
  [SECURITY_PLUS_CERT]: COMPTIA_URLS.securityV7,
  [A_PLUS_CORE1_CERT]: COMPTIA_URLS.aPlusCore1,
  [A_PLUS_CORE2_CERT]: COMPTIA_URLS.aPlusCore2,
};

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
