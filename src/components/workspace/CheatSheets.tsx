"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { QuestionFlagButton } from "@/components/workspace/QuestionFlagButton";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuestionEntry {
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
  questions: QuestionEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/review?cert=${encodeURIComponent(certSlug)}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load cheat sheets");
          return;
        }

        setDomains(data.domains);
        setCertName(data.certName);
        setHasData(data.hasData);

        // Auto-expand domains with weak accuracy (<75%)
        const weakDomainIds = (data.domains as DomainSheet[])
          .filter((d) => d.questions.length > 0 && d.accuracy < 75)
          .map((d) => d.domain_id);
        setExpandedDomains(new Set(weakDomainIds));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
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

  const expandAll = () => {
    setExpandedDomains(new Set(testedDomains.map((d) => d.domain_id)));
  };

  const collapseAll = () => {
    setExpandedDomains(new Set());
  };

  /* Loading */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Spinner size="lg" />
        <p className="text-[14px] text-text-muted">
          Analysing your performance...
        </p>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <Card padding="md">
        <p className="text-[14px] text-text-primary">{error}</p>
      </Card>
    );
  }

  /* No data */
  if (!hasData) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold text-text-primary">
              No performance data yet
            </p>
            <p className="text-[14px] text-text-secondary mt-1 max-w-md">
              Complete a diagnostic exam or practice session to generate
              personalised review notes for your weak areas.
            </p>
          </div>
          <Link href={`/certifications/${certSlug}/diagnostic`}>
            <button className="px-4 py-2 text-[14px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              Start Diagnostic
            </button>
          </Link>
        </div>
      </Card>
    );
  }

  const testedDomains = domains.filter((d) => d.attempted > 0);
  const untestedDomains = domains.filter((d) => d.attempted === 0);
  const totalWeak = testedDomains.reduce((sum, d) => {
    return sum + d.questions.filter((q) => {
      const acc = q.times_seen > 0 ? q.times_correct / q.times_seen : 0;
      return acc < 0.6;
    }).length;
  }, 0);
  const totalQuestions = testedDomains.reduce((sum, d) => sum + d.questions.length, 0);
  const allExpanded = testedDomains.length > 0 && expandedDomains.size === testedDomains.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="md">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              Certification
            </span>
            <span className="text-[15px] font-semibold text-text-primary leading-snug">
              {certName}
            </span>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              Domains Tested
            </span>
            <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
              {testedDomains.length}
            </span>
            <span className="text-[12px] text-text-muted">
              of {domains.length} total
            </span>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              Questions
            </span>
            <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
              {totalQuestions}
            </span>
            <span className="text-[12px] text-text-muted">
              reviewed below
            </span>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              Weak Points
            </span>
            <span className="text-[24px] font-mono font-semibold tabular-nums leading-none text-text-primary">
              {totalWeak}
            </span>
            <span className="text-[12px] text-text-muted">
              below 60% accuracy
            </span>
          </div>
        </Card>
      </div>

      {/* Tested domains — expandable */}
      {testedDomains.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text-primary">
              Domain Review
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-mono text-text-muted tabular-nums">
                {testedDomains.length} {testedDomains.length === 1 ? "domain" : "domains"}
              </span>
              <button
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {testedDomains.map((domain) => {
              const isExpanded = expandedDomains.has(domain.domain_id);
              const weakCount = domain.questions.filter((q) => {
                const acc = q.times_seen > 0 ? q.times_correct / q.times_seen : 0;
                return acc < 0.6;
              }).length;

              return (
                <Card key={domain.domain_id} padding="sm" className="overflow-hidden">
                  {/* Domain header */}
                  <button
                    onClick={() => toggleDomain(domain.domain_id)}
                    className="w-full flex items-center justify-between gap-3 p-1 text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="flex-shrink-0 w-8 h-8 rounded-md bg-bg-page border border-border flex items-center justify-center text-[12px] font-mono font-semibold text-text-muted">
                        {domain.domain_number}
                      </span>
                      <span className="text-[14px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                        {domain.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {weakCount > 0 && (
                        <span className="text-[11px] font-mono text-text-muted">
                          {weakCount} weak
                        </span>
                      )}
                      <span className="text-[12px] font-mono text-text-muted tabular-nums">
                        {domain.exam_weight}%
                      </span>
                      <span className="text-[12px] font-mono font-semibold text-text-primary tabular-nums">
                        {domain.accuracy}%
                      </span>
                    </div>
                  </button>

                  {/* Domain accuracy bar */}
                  {isExpanded && (
                    <div className="px-1 pt-2 pb-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={domain.accuracy} size="sm" />
                        </div>
                        <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">
                          {domain.correct}/{domain.attempted} correct
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Expanded: question cards */}
                  {isExpanded && domain.questions.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 px-1 pb-1">
                      {domain.questions.map((q, i) => {
                        const qAccuracy =
                          q.times_seen > 0
                            ? Math.round((q.times_correct / q.times_seen) * 100)
                            : 0;

                        return (
                          <Card key={q.id} padding="sm" className="bg-bg-page">
                            {/* Question header */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-bg-surface border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-text-muted mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-[13px] font-medium text-text-primary leading-snug">
                                  {q.question_text}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[11px] font-mono text-text-muted tabular-nums">
                                  {q.times_correct}/{q.times_seen}
                                </span>
                                <span className="text-[12px] font-mono font-semibold text-text-primary tabular-nums">
                                  {qAccuracy}%
                                </span>
                              </div>
                            </div>

                            {/* Correct answer */}
                            <div className="bg-bg-surface border border-border rounded-md px-3 py-2 mb-2">
                              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                Correct Answer
                              </span>
                              <p className="text-[13px] text-text-primary leading-relaxed mt-0.5">
                                {q.correct_answer}
                              </p>
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <p className="text-[12px] text-text-secondary leading-relaxed mb-2">
                                {q.explanation}
                              </p>
                            )}

                            {/* Footer meta */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-text-muted uppercase">
                                  {getDifficultyLabel(q.difficulty)}
                                </span>
                                {qAccuracy < 60 && (
                                  <span className="text-[11px] font-mono text-text-muted">
                                    · Needs work
                                  </span>
                                )}
                              </div>
                              <QuestionFlagButton questionId={q.id} />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {isExpanded && domain.questions.length === 0 && (
                    <p className="mt-3 px-1 pb-1 text-[13px] text-text-muted">
                      No question details available for this domain.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Untested domains */}
      {untestedDomains.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text-primary">
              Not Yet Tested
            </h2>
            <span className="text-[12px] font-mono text-text-muted tabular-nums">
              {untestedDomains.length} {untestedDomains.length === 1 ? "domain" : "domains"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {untestedDomains.map((domain) => (
              <div
                key={domain.domain_id}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-bg-surface border border-border rounded-lg opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex-shrink-0 w-8 h-8 rounded-md bg-bg-page border border-border flex items-center justify-center text-[12px] font-mono font-semibold text-text-muted">
                    {domain.domain_number}
                  </span>
                  <span className="text-[14px] text-text-primary truncate">
                    {domain.title}
                  </span>
                </div>
                <span className="text-[13px] font-mono text-text-muted tabular-nums shrink-0">
                  {domain.exam_weight}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-page rounded-lg border border-border">
            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-[13px] text-text-muted">
              Practice these domains to unlock their review notes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
