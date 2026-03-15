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

const iconBgColors: Record<string, string> = {
  primary: "bg-blue-50 text-primary",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-red-50 text-danger",
  urgency: "bg-orange-50 text-urgency",
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

function TypeIcon({ type }: { type: string }) {
  const className = "w-5 h-5";
  switch (type) {
    case "diagnostic":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
        </svg>
      );
    case "srs_review":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      );
    case "domain_drill":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
        </svg>
      );
    case "practice_exam":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      );
    case "new_content":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      );
  }
}

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
        ${isClickable ? "hover:bg-bg-page hover:border-l-4 hover:shadow-sm transition-all cursor-pointer group" : ""}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBgColors[color]}`}>
          <TypeIcon type={type} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${labelColors[color]}`}>
              {typeLabels[type] || type}
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary leading-snug">
            {title}
          </h3>
          <p className="text-[13px] text-text-secondary mt-0.5 leading-relaxed">
            {description}
          </p>
          <p className="text-[12px] text-text-muted mt-1">{reason}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
          {questionCount != null && questionCount > 0 && (
            <span className="text-[14px] font-mono font-semibold text-text-primary tabular-nums">
              {questionCount}q
            </span>
          )}
          {estimatedMinutes != null && estimatedMinutes > 0 && (
            <span className="text-[12px] text-text-muted">
              ~{estimatedMinutes} min
            </span>
          )}
          {isClickable && (
            <svg className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
