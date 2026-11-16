import type { PathCert } from "./types";

/** Each path exam's code, as CompTIA prints it. */
export const EXAM_CODES: Record<PathCert, string> = {
  "security-plus-sy0-701": "SY0-701",
  "security-plus-sy0-801": "SY0-801",
  "network-plus-n10-009": "N10-009",
  "a-plus-core1-220-1201": "220-1201",
  "a-plus-core2-220-1202": "220-1202",
};

/**
 * Exams CertBench teaches in more than one version at once, newest first.
 * They're one exam to a learner: Pro on one version covers the others, since
 * it was CompTIA that moved the exam, not the learner.
 */
const VERSIONED: readonly (readonly PathCert[])[] = [["security-plus-sy0-801", "security-plus-sy0-701"]];

/** Every version of this exam CertBench teaches, newest first; empty when it has only the one. */
export function examVersions(cert: string): readonly PathCert[] {
  return VERSIONED.find((family) => (family as readonly string[]).includes(cert)) ?? [];
}

/** This exam's other versions, newest first. */
export function otherVersions(cert: string): PathCert[] {
  return examVersions(cert).filter((c) => c !== cert);
}

/**
 * The last day a version can be taken in English, where CompTIA has announced
 * it. SY0-701's is June 11, 2027 (August 13, 2027 in Japanese, Portuguese,
 * Spanish and Thai), from CompTIA's SY0-701 exam page.
 */
export const LAST_EXAM_DAY: Partial<Record<PathCert, string>> = {
  "security-plus-sy0-701": "2027-06-11",
};

/** The version that replaces this one, when CompTIA has announced its last day. */
export function newerVersion(cert: string): PathCert | null {
  if (!(cert in LAST_EXAM_DAY)) return null;
  const family = examVersions(cert);
  const i = family.indexOf(cert as PathCert);
  return i > 0 ? family[0] : null;
}

/** "June 11, 2027" for an ISO date, the same in every time zone. */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
