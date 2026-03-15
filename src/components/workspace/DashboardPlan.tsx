"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlock } from "@/components/workspace/SessionBlock";
import type { SessionPlanResult } from "@/lib/session/compute-plan";

export function DashboardPlan({ certSlug }: { certSlug: string }) {
  const [plan, setPlan] = useState<SessionPlanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlan() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/session-plan?cert=${certSlug}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load study plan");
          return;
        }
        setPlan(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
    return () => controller.abort();
  }, [certSlug]);

  if (loading) {
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
          <p className="text-[14px] text-danger">{error}</p>
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
      />

      {/* Session blocks */}
      {plan.blocks.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text-primary">
              Today&apos;s Study Plan
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">
                {plan.blocks.length} {plan.blocks.length === 1 ? "session" : "sessions"}
              </Badge>
              {totalMinutes > 0 && (
                <span className="text-[12px] text-text-muted">
                  ~{totalMinutes} min
                </span>
              )}
            </div>
          </div>
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
      )}
    </div>
  );
}
