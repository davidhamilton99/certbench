"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type {
  FullReport,
  DomainReport,
  Classification,
} from "@/lib/readiness-report/compute-report";
import type { Recommendation } from "@/lib/readiness-report/recommendations";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function classificationLabel(c: Classification): string {
  return { strong: "Strong", adequate: "Adequate", weak: "Weak", critical: "Critical" }[c];
}

function classificationVariant(
  c: Classification
): "success" | "warning" | "danger" | "neutral" {
  return {
    strong: "success" as const,
    adequate: "warning" as const,
    weak: "danger" as const,
    critical: "danger" as const,
  }[c];
}

function trendArrow(t: string): string {
  return { up: "↑", down: "↓", stable: "→", new: "—" }[t] || "—";
}

function trendColor(t: string): string {
  return {
    up: "text-success",
    down: "text-danger",
    stable: "text-text-muted",
    new: "text-text-muted",
  }[t] || "text-text-muted";
}

function recVariantStyle(v: Recommendation["variant"]): string {
  return {
    danger: "border-l-danger",
    warning: "border-l-warning",
    primary: "border-l-primary",
    success: "border-l-success",
  }[v];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ReadinessReport({ certSlug }: { certSlug: string }) {
  const [report, setReport] = useState<FullReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [certName, setCertName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/readiness-report?cert=${encodeURIComponent(certSlug)}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load report");
          return;
        }

        setReport(data.report);
        setRecommendations(data.recommendations);
        setCertName(data.certName);
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
          Generating readiness report...
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

  if (!report) return null;

  const scoreColor =
    report.overall_score >= 75
      ? "text-success"
      : report.overall_score >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="flex flex-col gap-6">
      {/* Header: score + overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall score */}
        <Card padding="lg" className="sm:col-span-1">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[12px] text-text-muted uppercase tracking-wider">
              Readiness Score
            </span>
            <span
              className={`text-[56px] font-mono font-semibold tabular-nums leading-none ${scoreColor}`}
            >
              {report.is_preliminary ? "~" : ""}
              {Math.round(report.overall_score)}
            </span>
            <span className="text-[13px] text-text-muted">/ 100</span>
            {report.is_preliminary && (
              <Badge variant="warning">Preliminary</Badge>
            )}
          </div>
        </Card>

        {/* Coverage + study time */}
        <Card padding="lg" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-text-muted uppercase tracking-wider">
                Question Coverage
              </span>
              <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {Math.round(report.coverage_pct)}%
              </span>
              <span className="text-[12px] text-text-muted font-mono tabular-nums">
                {report.total_questions_seen} / {report.total_questions}
              </span>
              <ProgressBar
                value={report.coverage_pct}
                size="sm"
                showLabel={false}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-text-muted uppercase tracking-wider">
                Est. Study Time
              </span>
              <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {report.studyTime.estimated_hours}h
              </span>
              {report.studyTime.days_until_exam !== null && (
                <span className="text-[12px] text-text-muted">
                  {report.studyTime.days_until_exam} days until exam
                </span>
              )}
              {report.studyTime.daily_pace_minutes !== null && (
                <span className="text-[12px] text-text-secondary font-medium">
                  {report.studyTime.daily_pace_minutes} min/day recommended
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary mb-3">
            Recommendations
          </h2>
          <div className="flex flex-col gap-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`bg-bg-surface border border-border border-l-4 ${recVariantStyle(rec.variant)} rounded-lg p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-medium text-text-primary">
                      {rec.title}
                    </span>
                    <span className="text-[13px] text-text-secondary">
                      {rec.description}
                    </span>
                  </div>
                  {rec.href && (
                    <a
                      href={rec.href}
                      className="text-[13px] text-primary hover:underline whitespace-nowrap flex-shrink-0"
                    >
                      Go →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain Analysis */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary mb-3">
          Domain Analysis
        </h2>
        <div className="flex flex-col gap-2">
          {report.domains.map((d: DomainReport) => (
            <Card key={d.domain_id} padding="md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-text-primary">
                    {d.domain_number} {d.title}
                  </span>
                  <Badge variant={classificationVariant(d.classification)}>
                    {classificationLabel(d.classification)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[14px] font-mono ${trendColor(d.trend)}`}>
                    {trendArrow(d.trend)}
                  </span>
                  <span className="text-[14px] font-mono font-semibold text-text-primary tabular-nums">
                    {Math.round(d.accuracy)}%
                  </span>
                </div>
              </div>

              <ProgressBar value={d.accuracy} size="sm" showLabel={false} />

              <div className="flex items-center gap-4 mt-2 text-[12px] text-text-muted">
                <span className="font-mono tabular-nums">
                  {d.correct}/{d.attempted} correct
                </span>
                <span className="font-mono tabular-nums">
                  Coverage: {Math.round(d.coverage_pct)}%
                </span>
                <span>
                  Exam weight: {d.exam_weight}%
                </span>
                {d.confidence_factor < 1 && (
                  <span className="text-warning">
                    Low confidence ({Math.round(d.confidence_factor * 100)}%)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Cert name footer */}
      <p className="text-[12px] text-text-muted text-center">
        {certName} — Generated {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
