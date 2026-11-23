import { A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT, replacedBy, usesOfficialObjectiveNumbers } from "./exam-versions";

/**
 * Exams whose objective names and descriptions on the site are CertBench's own
 * wording and not CompTIA's: the A+ objectives were written for the site "in
 * our own words: CompTIA's wording is copyrighted" (src/data/a-plus-v15/types.ts).
 * A page never quotes them as CompTIA's, and says whose wording they are.
 */
export const OBJECTIVES_IN_OWN_WORDS: readonly string[] = [A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT];

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
 * A domain's name in sentence case, as every heading on the site is set. The
 * database keeps CompTIA's capitals ("Threats, Vulnerabilities, and
 * Mitigations") and the copy tables write sentence case ("Networking
 * concepts"), so without this one exam's domains were named two ways on the
 * public pages. A word in capitals throughout, an abbreviation, keeps them.
 */
export function domainName(title: string): string {
  return title
    .split(" ")
    .map((word, i) => (i === 0 || /^[A-Z0-9]{2,}\b/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}

/** The longest title tag that a search result shows in full. */
export const TITLE_TAG_MAX = 60;
/** What the root layout's title template adds to a page's own title. */
const BRAND = " | CertBench";

/**
 * A topic's name in the middle of a sentence ("practice questions on the OSI
 * model"). The Network+ topics are CertBench's own, and each one opens with a
 * common word ("The OSI model", "High availability and DR"), so the first
 * letter is lowered, unless the first word is an abbreviation ("IP addressing
 * and subnets"). It is for the Network+ topics only: an A+ topic can open with
 * a name ("Windows tools"). A test holds every Network+ topic to its result.
 */
export function topicInSentence(topic: string): string {
  return /^[A-Z][a-z]/.test(topic) ? topic[0].toLowerCase() + topic.slice(1) : topic;
}

/**
 * The title tag of an objective or topic page, whole: the page sets it as an
 * absolute title, so the root layout's template is not added to it. It leads
 * with the topic, because nobody searches "Security+ objective 1.2": they
 * search the thing it covers. Security+ and A+ cite their objective numbers,
 * which are CompTIA's; the Network+ numbers are not, so a Network+ title cites
 * none. It is kept to TITLE_TAG_MAX characters, which a search result shows
 * whole: the brand is left off first, then the exam's code where the exam is
 * named without a number, and only a very long topic loses "practice
 * questions". The topic keeps the capitals it was written with ("macOS").
 */
export function objectivePageTitle(o: ObjectiveMetaInput): string {
  const retired = replacedBy(o.certSlug) !== null;
  const official = usesOfficialObjectiveNumbers(o.certSlug) && !retired;
  const exam = official ? `${o.examCode} ${o.code}` : retired ? o.shortCertName : `${o.shortCertName} ${o.examCode}`;
  const candidates = [
    `${o.topic}: ${exam} practice questions${BRAND}`,
    `${o.topic}: ${exam} practice questions`,
    ...(official ? [] : [`${o.topic}: ${o.shortCertName} practice questions`]),
    `${o.topic} (${exam})`,
  ];
  return candidates.find((title) => title.length <= TITLE_TAG_MAX) ?? candidates[candidates.length - 1];
}

/**
 * The page's description, in sentences that say who offers what. It names the
 * topic, and the objective's number where the number is CompTIA's.
 */
export function objectivePageDescription(o: ObjectiveMetaInput): string {
  const current = replacedBy(o.certSlug);
  if (current) {
    return `CertBench offers free ${o.shortCertName} practice questions written to ${o.examCode} objective ${o.code}: ${o.topic}. Each question is original and fully explained, and ${o.examCode} has been replaced by ${current}.`;
  }
  if (!usesOfficialObjectiveNumbers(o.certSlug)) {
    return `CertBench offers free ${o.shortCertName} (${o.examCode}) practice questions on ${topicInSentence(o.topic)}. Each question is original and fully explained.`;
  }
  return `CertBench offers free practice questions for ${o.shortCertName} (${o.examCode}) objective ${o.code}: ${o.topic}. Each question is original and fully explained.`;
}
