import "server-only";

import { cache } from "react";
import { loadPathBank } from "./bank";
import { buildRehearsal } from "./rehearsal";
import { seedFrom } from "@/core/path/compose";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { isPathCert, type PublicTestData } from "@/core/path/types";

export type { PublicTestData };

/**
 * The practice-test page's timed test: the same draw as a member's
 * full-length practice exam (each domain at its exam weight, spread across
 * objectives, mixed), seeded per exam so the static page stays stable. The
 * page offers it whole, 90 questions in 90 minutes, or cut to a half. A bank
 * too thin for the full length gets a half-length test instead.
 *
 * Null means the page has no test to offer: the exam is not a study path
 * exam, the database does not have it, or its bank is too thin for even a
 * half. A bank that could not be READ is not one of those cases: that throws,
 * so that a page being rebuilt keeps its last good copy (and is tried again)
 * instead of being rebuilt without its exam and kept that way for a day.
 *
 * Wrapped in React's cache: a page's metadata and its body ask for the same
 * test in one render, and the second asks nothing.
 */
export const loadPublicTest = cache(async (certSlug: string): Promise<PublicTestData | null> => {
  if (!isPathCert(certSlug)) return null;
  const bank = await loadPathBank(certSlug);
  if (!bank) return null;
  const { examName, examCode, domains } = bank.structure;
  const structure = { certSlug, examName, examCode, domains };
  const seed = seedFrom("public-test", certSlug);
  for (const size of ["full", "half"] as const) {
    const reps = buildRehearsal({ bank, size, seen: [], seed });
    if (reps.length >= REHEARSAL_FORMATS[size].questions) return { testId: certSlug, structure, size, reps };
  }
  return null;
});
