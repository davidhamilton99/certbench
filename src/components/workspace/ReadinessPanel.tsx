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

  return (
    <div className="flex flex-col gap-4">
      {/* Readiness Score */}
      <Card padding="lg">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-[48px] font-mono font-semibold text-text-primary tabular-nums leading-none">
            {isPreliminary ? "~" : ""}
            {Math.round(score)}
          </span>
          <span className="text-[15px] text-text-muted">/ 100</span>
          {isPreliminary && (
            <Badge variant="warning">Preliminary</Badge>
          )}
        </div>
        <ProgressBar value={score} size="md" showLabel={false} />
        <div className="flex items-center gap-4 mt-3 text-[13px] text-text-muted">
          <span className="font-mono tabular-nums">
            {totalQuestionsSeen} questions seen
          </span>
          <span>
            {totalQuestions - totalQuestionsSeen} remaining
          </span>
          {daysUntilExam !== null && (
            <span className={daysUntilExam <= 7 ? "text-urgency font-medium" : ""}>
              {daysUntilExam} day{daysUntilExam === 1 ? "" : "s"} until exam
            </span>
          )}
        </div>
      </Card>

      {/* Domain Breakdown */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary mb-3">
          Domain Breakdown
        </h2>
        <div className="flex flex-col gap-2">
          {sortedDomains.map((ds) => {
            const pct =
              ds.attempted > 0
                ? Math.round((ds.correct / ds.attempted) * 100)
                : 0;

            return (
              <div
                key={ds.domainId}
                className="bg-bg-surface border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[14px] text-text-primary">
                    {ds.domainNumber} {ds.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono text-text-muted tabular-nums">
                      {ds.correct}/{ds.attempted}
                    </span>
                    <Badge variant={ds.attempted > 0 ? getScoreVariant(pct) : "neutral"}>
                      {ds.attempted > 0 ? `${pct}%` : "—"}
                    </Badge>
                  </div>
                </div>
                <ProgressBar value={pct} size="sm" />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Exam weight: {ds.examWeight}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
