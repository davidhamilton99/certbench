import "server-only";

import { loadPathBank } from "./bank";
import { buildStop } from "./build-stop";
import { buildPlan } from "@/core/path/plan";
import { seedFrom } from "@/core/path/compose";
import { isPathCert, type QuickRoundData } from "@/core/path/types";

/**
 * One stop of an exam's path ("warmup" or an objective code), built the same
 * way the path builds it, for a public page to play inline. Seeded per page so
 * the static page stays stable. Never breaks the page: any problem → null and
 * the page renders without it.
 */
export async function loadQuickRound(certSlug: string, stopId: string): Promise<QuickRoundData | null> {
  if (!isPathCert(certSlug)) return null;
  try {
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
    return {
      cert: certSlug,
      examName: bank.structure.examName,
      title: built.stop.title,
      reps: built.reps,
      stopNumber: index + 1,
      totalStops: plan.stops.length,
      objectiveCount: bank.structure.domains.reduce((n, d) => n + d.objectives.length, 0),
    };
  } catch {
    return null;
  }
}
