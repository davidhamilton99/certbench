import { replacedBy, usesOfficialObjectiveNumbers } from "./exam-versions";

export interface ObjectiveMetaInput {
  certSlug: string;
  shortCertName: string;
  examCode: string;
  code: string;
  title: string;
  /** Short topic name, the words a learner would search. */
  topic: string;
}

/**
 * Leads with the topic: nobody searches "Security+ objective 1.2", they search
 * the thing it covers. Security+ and A+ cite their objective numbers, which are
 * CompTIA's; our Network+ ones aren't. The title is in sentence case like every
 * heading on the site, so the topic keeps the capitals it was written with
 * ("Signs of an attack", "IP addressing and subnets", "macOS").
 */
export function objectivePageTitle(o: ObjectiveMetaInput): string {
  const suffix =
    usesOfficialObjectiveNumbers(o.certSlug) && !replacedBy(o.certSlug)
      ? `${o.examCode} ${o.code}`
      : replacedBy(o.certSlug)
        ? o.shortCertName
        : `${o.shortCertName} ${o.examCode}`;
  return `${o.topic} practice questions (${suffix})`;
}

export function objectivePageDescription(o: ObjectiveMetaInput): string {
  const current = replacedBy(o.certSlug);
  if (current) {
    return `Free ${o.shortCertName} practice questions: ${o.topic}. Written to ${o.examCode} objective ${o.code}, with full explanations. Most topics carry over to ${current}.`;
  }
  if (!usesOfficialObjectiveNumbers(o.certSlug)) {
    return `Free ${o.shortCertName} (${o.examCode}) practice questions: ${o.topic}. Original, exam-style, with full explanations.`;
  }
  return `Free ${o.shortCertName} (${o.examCode}) practice questions for objective ${o.code}: ${o.title}. Original, exam-style, with full explanations.`;
}
