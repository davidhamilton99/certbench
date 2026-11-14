/**
 * Security+ SY0-801, and how CertBench's SY0-701 bank moves onto it. SY0-801 is
 * its own exam beside SY0-701, which can still be taken until June 11, 2027:
 * the SY0-801 exam gets a copy of each SY0-701 question that carries over, and
 * nothing here changes an SY0-701 question.
 */

export interface V8MapObjective {
  code: string;
  /** Short label for maps and headings. The public SY0-801 pages' own. */
  label: string;
  /** What the objective covers, in our own words: CompTIA's wording is copyrighted. */
  title: string;
}

export interface V8MapDomain {
  number: string;
  title: string;
  /** Percent of the exam, from CompTIA's SY0-801 exam objectives. */
  weight: number;
  objectives: V8MapObjective[];
}

/** SY0-801 wording for a question's copy. The SY0-701 original keeps its own. */
export interface V8QuestionFix {
  /** Why the copy needs different wording. */
  why: string;
  question?: string;
  options?: readonly [string, string, string, string];
  answer?: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface Sy0801Map {
  slug: string;
  /** The SY0-701 exam whose questions carry over. */
  sourceSlug: string;
  examCode: string;
  sourceExamCode: string;
  passingScore: number;
  domains: V8MapDomain[];
  /**
   * SY0-701 objective code → SY0-801 objective, for every question not listed
   * under overrides. "2.0" covers the domain 2 questions the database never
   * tagged to an objective.
   */
  objectiveMap: Record<string, string>;
  /** Questions whose subject belongs to another SY0-801 objective: id → its code, and why. */
  overrides: Record<string, { to: string; why: string }>;
  /** Questions on topics SY0-801 doesn't name: not copied (they stay live on SY0-701), and why. */
  retired: Record<string, string>;
  /** Copies that need SY0-801 wording, by the SY0-701 question's id. */
  fixes: Record<string, V8QuestionFix>;
  /** Every Security+ lab scenario's SY0-801 domain, by scenario id. */
  labDomains: Record<string, string>;
  /** Domains whose closing lab isn't the default pick (core/path/labs.ts): domain → scenario id. */
  closingLabs: Record<string, string>;
}
