import "server-only";

import type { Db } from "@/server/supabase/server";
import {
  computeSessionPlan,
  type SessionPlanResult,
} from "@/core/session-plan/compute-plan";
import { computeReadinessTrend } from "@/core/readiness/compute-trend";
import { listDomains } from "@/server/data/certifications";
import { countActiveQuestions } from "@/server/data/questions";
import { listPerformanceWithDomains } from "@/server/data/performance";
import {
  getLastFullExamDate,
  hasCompletedDiagnostic,
} from "@/server/data/attempts";
import { listRecentSnapshots } from "@/server/data/readiness";

/**
 * Assembles everything the session planner needs and runs it.
 * Called from the dashboard Server Component — no API hop.
 */
export async function getSessionPlan(
  db: Db,
  userId: string,
  certId: string,
  examDate: string | null
): Promise<SessionPlanResult> {
  const [
    diagnosticComplete,
    domains,
    performance,
    totalQuestionCount,
    lastFullExamDate,
    snapshots,
  ] = await Promise.all([
    hasCompletedDiagnostic(db, userId, certId),
    listDomains(db, certId),
    listPerformanceWithDomains(db, userId, certId),
    countActiveQuestions(db, certId),
    getLastFullExamDate(db, userId, certId),
    listRecentSnapshots(db, userId, certId),
  ]);

  // Trend compares the latest snapshot score against a ~week-old baseline.
  const currentScore = snapshots.length > 0 ? Number(snapshots[0].overall_score) : 0;
  const readinessTrend =
    snapshots.length > 1
      ? computeReadinessTrend(currentScore, snapshots.slice(1))
      : null;

  return computeSessionPlan({
    diagnosticComplete,
    examDate,
    readinessTrend,
    domains: domains.map((d) => ({
      id: d.id,
      domain_number: d.domainNumber,
      title: d.title,
      exam_weight: d.examWeight,
    })),
    questionPerformance: performance,
    totalQuestionCount,
    lastFullExamDate,
  });
}
