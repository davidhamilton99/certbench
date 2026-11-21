import "server-only";

import { loadPathBank } from "./bank";
import { buildRehearsal } from "./rehearsal";
import { seedFrom } from "@/core/path/compose";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { isPathCert, type PublicTestData } from "@/core/path/types";

export type { PublicTestData };

/**
 * The practice-test page's timed test: the same draw as a member's half-length
 * exam rehearsal (each domain at its exam weight, spread across objectives,
 * mixed), seeded per exam so the static page stays stable. Never breaks the
 * page: any problem, or a bank too thin for a full test, means null and the
 * page renders without it.
 */
export async function loadPublicTest(certSlug: string): Promise<PublicTestData | null> {
  if (!isPathCert(certSlug)) return null;
  try {
    const bank = await loadPathBank(certSlug);
    if (!bank) return null;
    const reps = buildRehearsal({ bank, size: "half", seen: [], seed: seedFrom("public-test", certSlug) });
    if (reps.length < REHEARSAL_FORMATS.half.questions) return null;
    const { examName, examCode, domains } = bank.structure;
    return { testId: certSlug, structure: { certSlug, examName, examCode, domains }, reps };
  } catch {
    return null;
  }
}
