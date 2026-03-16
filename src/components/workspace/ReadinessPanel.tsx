import { ProgressBar } from "@/components/ui/ProgressBar";

interface DomainScore {
  domainId: string;
  domainNumber: string;
  title: string;
  examWeight: number;
  score: number;
  attempted: number;
  correct: number;
}

interface ReadinessPanelProps {
  score: number;
  isPreliminary: boolean;
  domainScores: DomainScore[];
  totalQuestionsSeen: number;
  totalQuestions: number;
  examDate: string | null;
  daysUntilExam: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 40) return "text-text-primary";
  return "text-danger";
}

export function ReadinessPanel({
  score,
  isPreliminary,
  domainScores,
  totalQuestionsSeen,
  totalQuestions,
  examDate,
  daysUntilExam,
}: ReadinessPanelProps) {
  const sortedDomains = [...domainScores].sort(
    (a, b) => parseFloat(a.domainNumber) - parseFloat(b.domainNumber)
  );

  const roundedScore = Math.round(score);
  const coveragePct = totalQuestions > 0 ? Math.round((totalQuestionsSeen / totalQuestions) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Score headline + inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
        {/* Big score */}
        <div className="flex items-baseline gap-2">
          <span className={`text-[56px] font-mono font-bold tabular-nums leading-none tracking-tight ${getScoreColor(roundedScore)}`}>
            {isPreliminary ? "~" : ""}{roundedScore}
          </span>
          <div className="flex flex-col pb-1">
            <span className="text-[13px] font-medium text-text-secondary">
              Readiness
            </span>
            {isPreliminary && (
              <span className="text-[11px] text-text-muted">preliminary</span>
            )}
          </div>
        </div>

        {/* Inline stats */}
        <div className="flex items-center gap-6 pb-1.5 text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Seen</span>
            <span className="font-mono font-medium text-text-primary tabular-nums">{totalQuestionsSeen}</span>
            <span className="text-text-muted">/ {totalQuestions}</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Coverage</span>
            <span className="font-mono font-medium text-text-primary tabular-nums">{coveragePct}%</span>
          </div>
          {daysUntilExam !== null && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Exam in</span>
                <span className={`font-mono font-medium tabular-nums ${
                  daysUntilExam <= 7 ? "text-danger" : "text-text-primary"
                }`}>
                  {daysUntilExam}d
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Domain rows */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
          Domains
        </h2>
        <div className="flex flex-col">
          {sortedDomains.map((ds, i) => {
            const pct =
              ds.attempted > 0
                ? Math.round((ds.correct / ds.attempted) * 100)
                : 0;

            return (
              <div
                key={ds.domainId}
                className={`flex items-center gap-4 py-2.5 ${
                  i < sortedDomains.length - 1 ? "border-b border-border-light" : ""
                }`}
              >
                <span className="text-[12px] font-mono text-text-muted w-6 text-right shrink-0">
                  {ds.domainNumber}
                </span>
                <span className="text-[13px] text-text-primary flex-1 min-w-0 truncate">
                  {ds.title}
                </span>
                <div className="w-24 shrink-0 hidden sm:block">
                  <ProgressBar value={pct} size="sm" />
                </div>
                <span className={`text-[13px] font-mono font-medium tabular-nums w-10 text-right shrink-0 ${
                  ds.attempted > 0 ? getScoreColor(pct) : "text-text-muted"
                }`}>
                  {ds.attempted > 0 ? `${pct}%` : "—"}
                </span>
                <span className="text-[11px] font-mono text-text-muted tabular-nums w-8 text-right shrink-0">
                  {ds.correct}/{ds.attempted}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
