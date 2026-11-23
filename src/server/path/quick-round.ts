import "server-only";

import { loadPathBank } from "./bank";
import { buildStop } from "./build-stop";
import { buildPlan } from "@/core/path/plan";
import { seedFrom } from "@/core/path/compose";
import { isPathCert, type QuickRoundData } from "@/core/path/types";

/**
 * One stop of an exam's path ("warmup" or an objective code), built the same
 * way the path builds it, for a public page to play inline. Seeded per page so
 * the static page stays stable.
 *
 * Null means the page has no round to offer: the exam is not a study path
 * exam, the database does not have it, there is no such step, or the step has
 * no questions. A bank that could not be READ is not one of those cases: that
 * throws, so that a page being rebuilt keeps its last good copy (and is tried
 * again) instead of being rebuilt without its questions.
 */
export async function loadQuickRound(certSlug: string, stopId: string): Promise<QuickRoundData | null> {
  if (!isPathCert(certSlug)) return null;
  const bank = await loadPathBank(certSlug);
  if (!bank) return null;
  const plan = buildPlan(bank.structure);
  const index = plan.stops.findIndex((s) => s.id === stopId && (s.kind === "learn" || s.kind === "warmup"));
  if (index < 0) return null;
  const built = buildStop({
    bank,
    plan,
    index,
    seen: [],
    missed: [],
    seed: seedFrom("page", certSlug, stopId),
  });
  if (!built || built.reps.length === 0) return null;
  // The page's map needs the domains and objectives, not the lab library.
  const { certSlug: slug, examName, examCode, domains } = bank.structure;
  return {
    cert: certSlug,
    examName,
    title: built.stop.title,
    reps: built.reps,
    structure: { certSlug: slug, examName, examCode, domains },
  };
}
