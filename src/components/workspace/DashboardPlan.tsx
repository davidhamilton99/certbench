"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlock } from "@/components/workspace/SessionBlock";
import type { SessionPlanResult } from "@/lib/session/compute-plan";

export function DashboardPlan({ certSlug }: { certSlug: string }) {
  const [plan, setPlan] = useState<SessionPlanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/session-plan?cert=${certSlug}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load study plan");
          return;
        }
        setPlan(data);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [certSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[14px] text-danger">{error}</p>
    );
  }

  if (!plan) return null;

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
        certSlug={certSlug}
      />

      {/* Session blocks */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary mb-3">
          Today&apos;s Study Plan
        </h2>
        <div className="flex flex-col gap-3">
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
    </div>
  );
}
