import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

function getScoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

function getStrokeColor(score: number): string {
  if (score >= 75) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
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

  // SVG radial gauge constants
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - roundedScore / 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Score + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radial score gauge */}
        <Card padding="lg" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="var(--color-border-light)"
                  strokeWidth="8"
                />
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke={getStrokeColor(roundedScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-[32px] font-mono font-semibold tabular-nums leading-none ${getScoreColor(roundedScore)}`}>
                  {isPreliminary ? "~" : ""}{roundedScore}
                </span>
                <span className="text-[12px] text-text-muted mt-0.5">/ 100</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[14px] font-semibold text-text-primary">
                Readiness Score
              </span>
              {isPreliminary && (
                <Badge variant="warning">Preliminary</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Questions Seen */}
          <Card padding="md">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
                Questions Seen
              </span>
              <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {totalQuestionsSeen}
              </span>
              <span className="text-[12px] text-text-muted">
                of {totalQuestions} total
              </span>
            </div>
          </Card>

          {/* Coverage */}
          <Card padding="md">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
                Coverage
              </span>
              <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {coveragePct}%
              </span>
              <ProgressBar value={coveragePct} size="sm" color="primary" />
            </div>
          </Card>

          {/* Days Until Exam / Remaining */}
          <Card padding="md" className="col-span-2 sm:col-span-1">
            <div className="flex flex-col gap-1.5">
              {daysUntilExam !== null ? (
                <>
                  <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    Exam In
                  </span>
                  <span className={`text-[24px] font-mono font-semibold tabular-nums leading-none ${
                    daysUntilExam <= 7 ? "text-urgency" : "text-text-primary"
                  }`}>
                    {daysUntilExam}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    day{daysUntilExam === 1 ? "" : "s"} remaining
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    Remaining
                  </span>
                  <span className="text-[24px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                    {totalQuestions - totalQuestionsSeen}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    questions to go
                  </span>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-text-primary">
            Domain Breakdown
          </h2>
          <span className="text-[12px] text-text-muted">
            {sortedDomains.length} domains
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedDomains.map((ds) => {
            const pct =
              ds.attempted > 0
                ? Math.round((ds.correct / ds.attempted) * 100)
                : 0;
            const variant = ds.attempted > 0 ? getScoreVariant(pct) : "neutral";

            return (
              <Card key={ds.domainId} padding="sm" className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-md bg-bg-page border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-text-muted mt-0.5">
                      {ds.domainNumber}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2">
                        {ds.title}
                      </span>
                      <span className="text-[11px] text-text-muted mt-0.5">
                        {ds.examWeight}% of exam
                      </span>
                    </div>
                  </div>
                  <Badge variant={variant}>
                    {ds.attempted > 0 ? `${pct}%` : "—"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar value={pct} size="sm" />
                  </div>
                  <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">
                    {ds.correct}/{ds.attempted}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
