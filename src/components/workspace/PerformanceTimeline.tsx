"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LineChart, type Series } from "@/components/ui/charts/LineChart";
import { formatDateShort, generateDateRange } from "@/components/ui/charts/chart-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DomainScore {
  domain_id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
  raw_score: number;
  confidence_factor: number;
  attempted: number;
  correct: number;
}

interface Snapshot {
  overall_score: number;
  domain_scores: DomainScore[];
  computed_at: string;
  is_preliminary: boolean;
  total_questions_seen: number;
}

interface Domain {
  id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DOMAIN_COLORS = [
  "#2563eb", // blue
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
];

const RANGES: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PerformanceTimeline({ certSlug }: { certSlug: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [certName, setCertName] = useState("");
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/analytics/timeline?cert=${encodeURIComponent(certSlug)}&range=${range}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load analytics");
          return;
        }

        setSnapshots(data.snapshots);
        setDomains(data.domains);
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
  }, [certSlug, range]);

  /* Loading state */
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
        <p className="text-[15px] text-text-secondary">Loading analytics...</p>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <Card padding="lg">
        <p className="text-[14px] text-danger">{error}</p>
      </Card>
    );
  }

  /* Derived data */
  const latestSnapshot = snapshots[snapshots.length - 1];
  const earliestSnapshot = snapshots[0];

  const scoreDelta =
    latestSnapshot && earliestSnapshot
      ? Number(latestSnapshot.overall_score) -
        Number(earliestSnapshot.overall_score)
      : 0;

  /* Activity summary */
  const activityByDay = new Map<string, number>();
  snapshots.forEach((s) => {
    const day = s.computed_at.split("T")[0];
    activityByDay.set(day, (activityByDay.get(day) || 0) + 1);
  });

  /* X-axis formatter */
  const fmtX = (ts: number) => formatDateShort(new Date(ts));
  const fmtY = (v: number) => `${v}%`;

  /* Overall score series */
  const overallSeries: Series[] = [
    {
      id: "overall",
      label: "Overall Score",
      data: snapshots.map((s) => ({
        x: new Date(s.computed_at).getTime(),
        y: Number(s.overall_score),
      })),
      color: "#2563eb",
    },
  ];

  /* Per-domain series */
  const domainSeries: Series[] = domains.map((domain, i) => ({
    id: domain.id,
    label: `${domain.domain_number} ${domain.title}`,
    data: snapshots
      .map((s) => {
        const ds = (s.domain_scores as DomainScore[]).find(
          (d) => d.domain_id === domain.id
        );
        if (!ds || ds.attempted === 0) return null;
        return {
          x: new Date(s.computed_at).getTime(),
          y: Math.round(ds.raw_score * 100) / 100,
        };
      })
      .filter((d): d is { x: number; y: number } => d !== null),
    color: DOMAIN_COLORS[i % DOMAIN_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-text-secondary">{certName}</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`
                px-3 py-1.5 rounded-md text-[13px] font-medium
                transition-colors duration-150
                ${
                  range === r.days
                    ? "bg-primary text-white"
                    : "bg-bg-surface border border-border text-text-secondary hover:bg-bg-page hover:text-text-primary"
                }
              `}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {snapshots.length === 0 ? (
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
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <p className="text-[15px] text-text-secondary text-center max-w-md">
              No performance data in the last {range} days. Complete a
              diagnostic exam or practice session to start tracking your
              progress.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="sm">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-text-muted uppercase tracking-wider">
                  Current Score
                </span>
                <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                  {Math.round(Number(latestSnapshot.overall_score))}%
                </span>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-text-muted uppercase tracking-wider">
                  Change
                </span>
                <span
                  className={`text-[28px] font-mono font-semibold tabular-nums leading-none ${
                    scoreDelta > 0
                      ? "text-success"
                      : scoreDelta < 0
                      ? "text-danger"
                      : "text-text-secondary"
                  }`}
                >
                  {scoreDelta > 0 ? "+" : ""}
                  {Math.round(scoreDelta)}%
                </span>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-text-muted uppercase tracking-wider">
                  Sessions
                </span>
                <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                  {snapshots.length}
                </span>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-text-muted uppercase tracking-wider">
                  Active Days
                </span>
                <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                  {activityByDay.size}
                </span>
              </div>
            </Card>
          </div>

          {/* Overall score chart */}
          <Card padding="lg">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-text-primary">
                  Readiness Score
                </h2>
                {latestSnapshot.is_preliminary && (
                  <Badge variant="warning">Preliminary</Badge>
                )}
              </div>
              <LineChart
                series={overallSeries}
                height={240}
                yDomain={[0, 100]}
                thresholds={[{ value: 75, color: "#16a34a", label: "Passing" }]}
                xFormatter={fmtX}
                yFormatter={fmtY}
              />
            </div>
          </Card>

          {/* Domain trends chart */}
          {domainSeries.some((s) => s.data.length > 0) && (
            <Card padding="lg">
              <div className="flex flex-col gap-3">
                <h2 className="text-[15px] font-semibold text-text-primary">
                  Domain Trends
                </h2>
                <LineChart
                  series={domainSeries.filter((s) => s.data.length > 0)}
                  height={280}
                  yDomain={[0, 100]}
                  thresholds={[{ value: 75, color: "#16a34a" }]}
                  xFormatter={fmtX}
                  yFormatter={fmtY}
                  showLegend
                  showDots={false}
                />
              </div>
            </Card>
          )}

          {/* Activity heatmap */}
          <Card padding="lg">
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-text-primary">
                Activity
              </h2>
              <div className="flex flex-wrap gap-1">
                {generateDateRange(range).map((date) => {
                  const key = date.toISOString().split("T")[0];
                  const count = activityByDay.get(key) || 0;
                  return (
                    <div
                      key={key}
                      title={`${formatDateShort(date)}: ${count} session${count !== 1 ? "s" : ""}`}
                      className={`w-3.5 h-3.5 rounded-sm ${
                        count === 0
                          ? "bg-border-light"
                          : count === 1
                          ? "bg-primary/30"
                          : count === 2
                          ? "bg-primary/60"
                          : "bg-primary"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[12px] text-text-muted">
                {snapshots.length} session{snapshots.length !== 1 ? "s" : ""}{" "}
                across {activityByDay.size} active day
                {activityByDay.size !== 1 ? "s" : ""}
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
