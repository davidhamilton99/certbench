/**
 * Rules-based recommendation engine for exam readiness reports.
 * Generates prioritised action items with links.
 */

import type { FullReport, DomainReport } from "./compute-report";

export interface Recommendation {
  priority: number; // lower = higher priority
  title: string;
  description: string;
  href: string | null;
  variant: "danger" | "warning" | "primary" | "success";
}

export function generateRecommendations(
  report: FullReport,
  certSlug: string
): Recommendation[] {
  const recs: Recommendation[] = [];

  const criticalDomains = report.domains.filter(
    (d) => d.classification === "critical"
  );
  const weakDomains = report.domains.filter(
    (d) => d.classification === "weak"
  );

  /* 1. Critical domains — highest priority */
  for (const d of criticalDomains) {
    recs.push({
      priority: 1,
      title: `Drill Domain ${d.domain_number}: ${d.title}`,
      description: `Accuracy is ${Math.round(d.accuracy)}% — well below passing. Focus intensive practice here.`,
      href: `/certifications/${certSlug}/exam?domain=${d.domain_id}`,
      variant: "danger",
    });
  }

  /* 2. SRS cards overdue */
  if (report.srs_due_count > 0) {
    recs.push({
      priority: 2,
      title: `Review ${report.srs_due_count} spaced repetition card${report.srs_due_count > 1 ? "s" : ""}`,
      description:
        "Overdue reviews weaken retention. Clear your SRS queue daily for best results.",
      href: `/certifications/${certSlug}/srs?cert=${certSlug}`,
      variant: "warning",
    });
  }

  /* 3. Weak domains */
  for (const d of weakDomains) {
    recs.push({
      priority: 3,
      title: `Strengthen Domain ${d.domain_number}: ${d.title}`,
      description: `At ${Math.round(d.accuracy)}%, this domain needs more practice to reach passing.`,
      href: `/certifications/${certSlug}/exam?domain=${d.domain_id}`,
      variant: "warning",
    });
  }

  /* 4. Low coverage */
  if (report.coverage_pct < 50) {
    recs.push({
      priority: 4,
      title: "Expand question coverage",
      description: `You've only seen ${Math.round(report.coverage_pct)}% of available questions. Take a full practice exam to encounter new material.`,
      href: `/certifications/${certSlug}/exam?cert=${certSlug}`,
      variant: "primary",
    });
  }

  /* 5. No recent exam */
  if (
    report.recent_exam_days_ago === null ||
    report.recent_exam_days_ago > 7
  ) {
    const dayText =
      report.recent_exam_days_ago !== null
        ? `${report.recent_exam_days_ago} days ago`
        : "never";
    recs.push({
      priority: 5,
      title: "Take a practice exam",
      description: `Your last exam was ${dayText}. Regular exams keep your readiness score accurate.`,
      href: `/certifications/${certSlug}/exam?cert=${certSlug}`,
      variant: "primary",
    });
  }

  /* 6. Exam approaching */
  if (
    report.studyTime.days_until_exam !== null &&
    report.studyTime.days_until_exam <= 30
  ) {
    const days = report.studyTime.days_until_exam;
    const pace = report.studyTime.daily_pace_minutes;

    if (days <= 7) {
      recs.push({
        priority: 0,
        title: `Exam in ${days} day${days !== 1 ? "s" : ""}`,
        description:
          pace !== null
            ? `Final stretch. Target ${pace} minutes of study per day to cover remaining material.`
            : "Focus on your weakest domains and clear all SRS reviews.",
        href: null,
        variant: "danger",
      });
    } else {
      recs.push({
        priority: 4,
        title: `${days} days until exam`,
        description:
          pace !== null
            ? `At your current pace, aim for ${pace} minutes of daily study.`
            : "Set a consistent daily study schedule to stay on track.",
        href: null,
        variant: "warning",
      });
    }
  }

  /* 7. High readiness — encouragement */
  if (report.overall_score >= 75 && !report.is_preliminary) {
    recs.push({
      priority: 10,
      title: "You're approaching exam readiness",
      description:
        "Your score is above the passing threshold. Continue practising to solidify your knowledge and build confidence.",
      href: null,
      variant: "success",
    });
  }

  /* 8. Preliminary score */
  if (report.is_preliminary) {
    const lowConfDomains = report.domains
      .filter((d) => d.confidence_factor < 1)
      .map((d) => `${d.domain_number}`)
      .join(", ");
    recs.push({
      priority: 3,
      title: "Score is preliminary",
      description: `Domains ${lowConfDomains} have fewer than 15 questions answered. Your readiness score will become more accurate with more practice.`,
      href: `/certifications/${certSlug}/exam?cert=${certSlug}`,
      variant: "warning",
    });
  }

  /* Sort by priority */
  return recs.sort((a, b) => a.priority - b.priority);
}
