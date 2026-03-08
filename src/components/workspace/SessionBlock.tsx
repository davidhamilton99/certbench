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

const borderColors: Record<string, string> = {
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
  urgency: "border-l-urgency",
};

const labelColors: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  urgency: "text-urgency",
};

const typeLabels: Record<string, string> = {
  diagnostic: "Diagnostic",
  srs_review: "Review",
  domain_drill: "Domain Drill",
  practice_exam: "Practice Exam",
  new_content: "New Content",
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
    case "srs_review":
      return `/certifications/${certSlug}/srs`;
    case "new_content":
      return `/certifications/${certSlug}/exam?type=weak_points`;
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
        border-l-4 ${borderColors[color]}
        p-4
        ${isClickable ? "hover:bg-bg-page transition-colors cursor-pointer" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-medium uppercase tracking-wide ${labelColors[color]}`}>
              {typeLabels[type] || type}
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary">
            {title}
          </h3>
          <p className="text-[14px] text-text-secondary">{description}</p>
          <p className="text-[13px] text-text-muted mt-0.5">{reason}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {questionCount && (
            <span className="text-[14px] font-mono text-text-secondary">
              {questionCount}q
            </span>
          )}
          {estimatedMinutes && (
            <span className="text-[12px] text-text-muted">
              ~{estimatedMinutes}m
            </span>
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
