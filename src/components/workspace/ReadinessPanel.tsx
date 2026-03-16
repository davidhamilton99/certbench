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
    <div className="flex flex-col gap-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {/* Readiness Score */}
        <div className="bg-bg-surface p-5 col-span-2 sm:col-span-1 flex flex-col items-center gap-1">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Readiness
          </span>
          <span className={`text-[36px] font-mono font-semibold tabular-nums leading-none ${getScoreColor(roundedScore)}`}>
            {isPreliminary ? "~" : ""}{roundedScore}
          </span>
          <span className="text-[11px] text-text-muted">
            {isPreliminary ? "preliminary" : "out of 100"}
          </span>
        </div>

        {/* Questions Seen */}
        <div className="bg-bg-surface p-5 flex flex-col items-center gap-1">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Seen
          </span>
          <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
            {totalQuestionsSeen}
          </span>
          <span className="text-[11px] text-text-muted">
            of {totalQuestions}
          </span>
        </div>

        {/* Coverage */}
        <div className="bg-bg-surface p-5 flex flex-col items-center gap-1">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Coverage
          </span>
          <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
            {coveragePct}%
          </span>
          <div className="w-full max-w-[80px] mt-0.5">
            <ProgressBar value={coveragePct} size="sm" color="primary" />
          </div>
        </div>

        {/* Days Until Exam / Remaining */}
        <div className="bg-bg-surface p-5 flex flex-col items-center gap-1">
          {daysUntilExam !== null ? (
            <>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Exam In
              </span>
              <span className={`text-[28px] font-mono font-semibold tabular-nums leading-none ${
                daysUntilExam <= 7 ? "text-danger" : "text-text-primary"
              }`}>
                {daysUntilExam}
              </span>
              <span className="text-[11px] text-text-muted">
                day{daysUntilExam === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Unseen
              </span>
              <span className="text-[28px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {totalQuestions - totalQuestionsSeen}
              </span>
              <span className="text-[11px] text-text-muted">
                remaining
              </span>
            </>
          )}
        </div>
      </div>

      {/* Domain Breakdown — table-style rows */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-text-secondary uppercase tracking-wider">
          Domains
        </h2>
        <div className="flex flex-col gap-px bg-border rounded-lg overflow-hidden border border-border">
          {sortedDomains.map((ds) => {
            const pct =
              ds.attempted > 0
                ? Math.round((ds.correct / ds.attempted) * 100)
                : 0;

            return (
              <div key={ds.domainId} className="bg-bg-surface px-4 py-3 flex items-center gap-4">
                <span className="text-[12px] font-mono font-semibold text-text-muted w-6 text-right shrink-0">
                  {ds.domainNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[13px] text-text-primary truncate">
                      {ds.title}
                    </span>
                    <span className={`text-[13px] font-mono font-medium tabular-nums shrink-0 ${
                      ds.attempted > 0 ? getScoreColor(pct) : "text-text-muted"
                    }`}>
                      {ds.attempted > 0 ? `${pct}%` : "—"}
                    </span>
                  </div>
                  <ProgressBar value={pct} size="sm" />
                </div>
                <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0 w-10 text-right">
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
