import { replacedBy, usesOfficialObjectiveNumbers } from "./exam-versions";

const SMALL_WORDS = new Set(["a", "an", "and", "of", "or", "the", "to", "in", "on", "for"]);

/**
 * "Signs of an attack" → "Signs of an Attack". Words with capitals of their
 * own (RAM, macOS, SOHO) stay as they are.
 */
export function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word, i) =>
      /^[a-z-]+[,]?$/.test(word) && (i === 0 || !SMALL_WORDS.has(word))
        ? word[0].toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}

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
 * the thing it covers. Only Security+ cites its objective number: A+ numbers
 * belong to a retired exam, and our Network+ ones aren't CompTIA's.
 */
export function objectivePageTitle(o: ObjectiveMetaInput): string {
  const suffix =
    usesOfficialObjectiveNumbers(o.certSlug) && !replacedBy(o.certSlug)
      ? `${o.examCode} ${o.code}`
      : replacedBy(o.certSlug)
        ? o.shortCertName
        : `${o.shortCertName} ${o.examCode}`;
  return `${titleCase(o.topic)} Practice Questions (${suffix})`;
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
