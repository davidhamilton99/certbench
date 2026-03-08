"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WeakQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  times_seen: number;
  times_correct: number;
}

interface DomainSheet {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  accuracy: number;
  attempted: number;
  correct: number;
  weak_questions: WeakQuestion[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function getDifficultyLabel(d: string): string {
  return { easy: "Easy", medium: "Medium", hard: "Hard" }[d] || d;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheatSheets({ certSlug }: { certSlug: string }) {
  const [domains, setDomains] = useState<DomainSheet[]>([]);
  const [certName, setCertName] = useState("");
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/cheat-sheets?cert=${encodeURIComponent(certSlug)}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load cheat sheets");
          return;
        }

        setDomains(data.domains);
        setCertName(data.certName);
        setHasData(data.hasData);

        // Auto-expand domains with weak questions
        const weakDomainIds = (data.domains as DomainSheet[])
          .filter((d) => d.weak_questions.length > 0)
          .map((d) => d.domain_id);
        setExpandedDomains(new Set(weakDomainIds));
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [certSlug]);

  const toggleDomain = (domainId: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-[15px] text-text-secondary">
          Analysing your weak areas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <p className="text-[14px] text-danger">{error}</p>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-3 py-6">
          <svg
            className="w-10 h-10 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
          <p className="text-[15px] text-text-secondary text-center max-w-md">
            No performance data yet. Complete a diagnostic exam or practice
            session to generate personalised cheat sheets based on your weak
            areas.
          </p>
        </div>
      </Card>
    );
  }

  const weakDomains = domains.filter((d) => d.weak_questions.length > 0);
  const strongDomains = domains.filter(
    (d) => d.weak_questions.length === 0 && d.attempted > 0
  );
  const untestedDomains = domains.filter((d) => d.attempted === 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <p className="text-[14px] text-text-secondary">{certName}</p>
        <span className="text-[13px] text-text-muted">
          {weakDomains.length} domain{weakDomains.length !== 1 ? "s" : ""} with
          weak areas
        </span>
      </div>

      {/* Weak domains (expanded) */}
      {weakDomains.length > 0 && (
        <div className="flex flex-col gap-3">
          {weakDomains.map((domain) => {
            const isExpanded = expandedDomains.has(domain.domain_id);

            return (
              <Card key={domain.domain_id} padding="md">
                {/* Domain header */}
                <button
                  onClick={() => toggleDomain(domain.domain_id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                    <span className="text-[15px] font-semibold text-text-primary">
                      {domain.domain_number} {domain.title}
                    </span>
                    <Badge variant={getScoreVariant(domain.accuracy)}>
                      {domain.accuracy}%
                    </Badge>
                  </div>
                  <span className="text-[12px] text-text-muted">
                    {domain.weak_questions.length} weak topic
                    {domain.weak_questions.length !== 1 ? "s" : ""} ·{" "}
                    {domain.exam_weight}% of exam
                  </span>
                </button>

                {/* Expanded: weak questions as study cards */}
                {isExpanded && (
                  <div className="mt-4 flex flex-col gap-3 pl-6">
                    {domain.weak_questions.map((q, i) => {
                      const qAccuracy =
                        q.times_seen > 0
                          ? Math.round(
                              (q.times_correct / q.times_seen) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={q.id}
                          className="bg-bg-page border border-border-light rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[13px] font-medium text-text-primary leading-snug">
                              {i + 1}. {q.question_text}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[11px] font-mono text-text-muted tabular-nums">
                                {q.times_correct}/{q.times_seen}
                              </span>
                              <Badge
                                variant={getScoreVariant(qAccuracy)}
                              >
                                {qAccuracy}%
                              </Badge>
                            </div>
                          </div>

                          {/* Correct answer */}
                          <div className="bg-success/5 border border-success/20 rounded-md px-3 py-2 mb-2">
                            <span className="text-[12px] font-medium text-success uppercase tracking-wider">
                              Correct Answer
                            </span>
                            <p className="text-[13px] text-text-primary mt-0.5">
                              {q.correct_answer}
                            </p>
                          </div>

                          {/* Explanation */}
                          {q.explanation && (
                            <p className="text-[12px] text-text-secondary leading-relaxed">
                              {q.explanation}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="neutral">
                              {getDifficultyLabel(q.difficulty)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Strong domains (collapsed summary) */}
      {strongDomains.length > 0 && (
        <div>
          <h2 className="text-[14px] font-semibold text-text-primary mb-2">
            Strong Domains
          </h2>
          <div className="flex flex-col gap-1.5">
            {strongDomains.map((domain) => (
              <div
                key={domain.domain_id}
                className="flex items-center justify-between bg-bg-surface border border-border rounded-lg px-4 py-2.5"
              >
                <span className="text-[14px] text-text-primary">
                  {domain.domain_number} {domain.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-text-muted tabular-nums">
                    {domain.correct}/{domain.attempted}
                  </span>
                  <Badge variant="success">{domain.accuracy}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untested domains */}
      {untestedDomains.length > 0 && (
        <div>
          <h2 className="text-[14px] font-semibold text-text-primary mb-2">
            Not Yet Tested
          </h2>
          <div className="flex flex-col gap-1.5">
            {untestedDomains.map((domain) => (
              <div
                key={domain.domain_id}
                className="flex items-center justify-between bg-bg-surface border border-border rounded-lg px-4 py-2.5"
              >
                <span className="text-[14px] text-text-secondary">
                  {domain.domain_number} {domain.title}
                </span>
                <span className="text-[12px] text-text-muted">
                  {domain.exam_weight}% of exam
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
