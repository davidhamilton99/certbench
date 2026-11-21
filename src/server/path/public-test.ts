import "server-only";

import { loadPathBank } from "./bank";
import { buildRehearsal } from "./rehearsal";
import { seedFrom } from "@/core/path/compose";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { isPathCert, type PublicTestData } from "@/core/path/types";

export type { PublicTestData };

/**
 * The practice-test page's timed test: the same draw as a member's
 * full-length exam rehearsal (each domain at its exam weight, spread across
 * objectives, mixed), seeded per exam so the static page stays stable. The
 * page offers it whole, 90 questions in 90 minutes, or cut to a half. A bank
 * too thin for the full length gets a half-length test instead. Never breaks
 * the page: any problem, or a bank too thin for even a half, means null and
 * the page renders without it.
 */
export async function loadPublicTest(certSlug: string): Promise<PublicTestData | null> {
  if (!isPathCert(certSlug)) return null;
  try {
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
  } catch {
    return null;
  }
}
