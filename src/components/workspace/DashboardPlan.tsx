"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlock } from "@/components/workspace/SessionBlock";
import type { SessionPlanResult } from "@/lib/session/compute-plan";
import { api } from "@/lib/api";

export function DashboardPlan({ certSlug }: { certSlug: string }) {
  const { data: plan, isPending, error } = useQuery({
    queryKey: ["session-plan", certSlug],
    queryFn: ({ signal }) =>
      api.get<SessionPlanResult>("/api/session-plan", {
        params: { cert: certSlug },
        signal,
      }),
  });

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Spinner size="lg" />
        <p className="text-[14px] text-text-muted">Loading your study plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card accent="danger" padding="md">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-[14px] text-danger">
            {error.message || "Failed to load study plan"}
          </p>
        </div>
      </Card>
    );
  }

  if (!plan) return null;

  const totalMinutes = plan.blocks.reduce((sum, b) => sum + (b.estimatedMinutes || 0), 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Readiness panel */}
      <ReadinessPanel
        score={plan.readinessScore}
        isPreliminary={plan.readinessIsPreliminary}
        domainScores={plan.domainScores}
        totalQuestionsSeen={plan.totalQuestionsSeen}
        totalQuestions={plan.totalQuestions}
        examDate={plan.examDate}
        daysUntilExam={plan.daysUntilExam}
        trend={plan.readinessTrend}
      />

      {/* Session blocks */}
      {plan.blocks.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-text-secondary uppercase tracking-wider">
              Today&apos;s Plan
            </h2>
            {totalMinutes > 0 && (
              <span className="text-[12px] font-mono text-text-muted">
                {plan.blocks.length} sessions &middot; ~{totalMinutes} min
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {plan.blocks.map((block, i) => (
              <SessionBlock
                key={`${block.type}-${i}`}
                type={block.type}
                title={block.title}
                description={block.description}
                reason={block.reason}
                questionCount={block.questionCount}
                estimatedMinutes={block.estimatedMinutes}
                color={block.color}
                certSlug={certSlug}
                domainNumber={block.domainNumber}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card accent="success" padding="md">
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium text-text-primary">
              You&apos;re all caught up
            </p>
            <p className="text-[13px] text-text-muted">
              No sessions scheduled for today. Check back tomorrow for SRS reviews, or start a practice exam.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
