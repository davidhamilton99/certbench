import Link from "next/link";

interface SessionBlockProps {
  type: string;
  title: string;
  description: string;
  reason: string;
  questionCount?: number;
  estimatedMinutes?: number;
  color: "primary" | "success" | "warning" | "danger" | "urgency";
  certSlug: string;
  domainNumber?: string;
}

const typeLabels: Record<string, string> = {
  diagnostic: "DIAGNOSTIC",
  srs_review: "REVIEW",
  domain_drill: "DRILL",
  weak_points: "WEAK POINTS",
  practice_exam: "EXAM",
  new_content: "NEW",
};

function getHref(
  type: string,
  certSlug: string,
  domainNumber?: string
): string | null {
  switch (type) {
    case "diagnostic":
      return `/certifications/${certSlug}/diagnostic`;
    case "practice_exam":
      return `/certifications/${certSlug}/exam`;
    case "domain_drill":
      return domainNumber
        ? `/certifications/${certSlug}/exam?type=domain_drill&domain=${domainNumber}`
        : null;
    case "weak_points":
      return `/certifications/${certSlug}/exam?type=weak_points`;
    case "srs_review":
      return `/certifications/${certSlug}/srs`;
    case "new_content":
      return `/certifications/${certSlug}/exam`;
    default:
      return null;
  }
}

export function SessionBlock({
  type,
  title,
  description,
  reason,
  questionCount,
  estimatedMinutes,
  color,
  certSlug,
  domainNumber,
}: SessionBlockProps) {
  const href = getHref(type, certSlug, domainNumber);
  const isClickable = href !== null;

  const content = (
    <div
      className={`
        bg-bg-surface border border-border rounded-lg
        px-4 py-3.5
        ${isClickable ? "hover:bg-bg-page hover:shadow-sm transition-all cursor-pointer group" : ""}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted font-mono">
              {typeLabels[type] || type}
            </span>
          </div>
          <h3 className="text-[14px] font-medium text-text-primary leading-snug">
            {title}
          </h3>
          <p className="text-[12px] text-text-muted mt-0.5">
            {description}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 shrink-0">
          {questionCount != null && questionCount > 0 && (
            <span className="text-[13px] font-mono text-text-secondary tabular-nums">
              {questionCount}q
            </span>
          )}
          {estimatedMinutes != null && estimatedMinutes > 0 && (
            <span className="text-[12px] font-mono text-text-muted tabular-nums">
              {estimatedMinutes}m
            </span>
          )}
          {isClickable && (
            <svg className="w-4 h-4 text-border group-hover:text-text-muted transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );

  if (isClickable && href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
