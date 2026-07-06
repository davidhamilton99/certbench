import "server-only";

import { createAnonClient } from "@/server/supabase/anon";
import {
  getCertificationBySlug,
  listActiveCertifications,
  listDomains,
  listSubObjectives,
} from "@/server/data/certifications";
import {
  countQuestionsBySubObjective,
  listQuestionsBySubObjective,
} from "@/server/data/questions";
import { codeToSlug, slugToCode } from "@/lib/seo/objective-code";

/**
 * An objective page is generated only when its sub-objective has at least
 * this many tagged questions — enough for real sample content, so the pages
 * aren't thin doorway pages. (Security+ is fully tagged; Network+ partially;
 * A+ is largely untagged and produces few/no pages, by design.)
 */
export const OBJECTIVE_MIN_QUESTIONS = 6;
const SAMPLE_COUNT = 5;

export { codeToSlug, slugToCode };

export interface ObjectiveParam {
  cert: string;
  code: string; // slug form, e.g. "1-2"
}

/** Every objective page that meets the content threshold (static params + sitemap). */
export async function listObjectivePages(): Promise<ObjectiveParam[]> {
  const db = createAnonClient();
  const certs = await listActiveCertifications(db);
  const out: ObjectiveParam[] = [];
  for (const cert of certs) {
    const [subs, counts] = await Promise.all([
      listSubObjectives(db, cert.id),
      countQuestionsBySubObjective(db, cert.id),
    ]);
    for (const s of subs) {
      if ((counts.get(s.id) ?? 0) >= OBJECTIVE_MIN_QUESTIONS) {
        out.push({ cert: cert.slug, code: codeToSlug(s.code) });
      }
    }
  }
  return out;
}

export interface ObjectiveLink {
  code: string;
  title: string;
  slug: string; // "1-2"
}

/** Objective pages for one cert — powers the hub list on the practice-test page. */
export async function listCertObjectivePages(
  certSlug: string
): Promise<ObjectiveLink[]> {
  const db = createAnonClient();
  const cert = await getCertificationBySlug(db, certSlug);
  if (!cert) return [];
  const [subs, counts] = await Promise.all([
    listSubObjectives(db, cert.id),
    countQuestionsBySubObjective(db, cert.id),
  ]);
  return subs
    .filter((s) => (counts.get(s.id) ?? 0) >= OBJECTIVE_MIN_QUESTIONS)
    .map((s) => ({ code: s.code, title: s.title, slug: codeToSlug(s.code) }));
}

/** Flat objective list across certs, tagged with certSlug — for the hub pages. */
export async function listObjectivesForCerts(
  certSlugs: string[]
): Promise<(ObjectiveLink & { certSlug: string })[]> {
  const groups = await Promise.all(
    certSlugs.map(async (slug) =>
      (await listCertObjectivePages(slug)).map((o) => ({ ...o, certSlug: slug }))
    )
  );
  return groups.flat();
}

export interface ObjectivePageData {
  certSlug: string;
  certName: string; // "CompTIA Security+"
  shortCertName: string; // "Security+"
  examCode: string; // "SY0-701"
  code: string; // "1.2"
  title: string; // objective title
  domainNumber: string | null;
  domainTitle: string | null;
  domainWeight: number | null;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  siblings: ObjectiveLink[];
}

/** Everything an objective page renders, or null if the page shouldn't exist. */
export async function loadObjectivePage(
  certSlug: string,
  codeSlug: string
): Promise<ObjectivePageData | null> {
  const db = createAnonClient();
  const cert = await getCertificationBySlug(db, certSlug);
  if (!cert) return null;

  const code = slugToCode(codeSlug);
  const [subs, domains, counts] = await Promise.all([
    listSubObjectives(db, cert.id),
    listDomains(db, cert.id),
    countQuestionsBySubObjective(db, cert.id),
  ]);

  const sub = subs.find((s) => s.code === code);
  if (!sub || (counts.get(sub.id) ?? 0) < OBJECTIVE_MIN_QUESTIONS) return null;

  const domain = domains.find((d) => d.id === sub.domain_id) ?? null;
  const questions = await listQuestionsBySubObjective(db, sub.id, SAMPLE_COUNT);

  // Sibling objectives in the same domain that also have pages.
  const siblings: ObjectiveLink[] = subs
    .filter(
      (s) =>
        s.id !== sub.id &&
        s.domain_id === sub.domain_id &&
        (counts.get(s.id) ?? 0) >= OBJECTIVE_MIN_QUESTIONS
    )
    .map((s) => ({ code: s.code, title: s.title, slug: codeToSlug(s.code) }));

  return {
    certSlug: cert.slug,
    certName: cert.name,
    shortCertName: cert.name.replace(/^CompTIA\s+/, ""),
    examCode: cert.examCode,
    code: sub.code,
    title: sub.title,
    domainNumber: domain?.domainNumber ?? null,
    domainTitle: domain?.title ?? null,
    domainWeight: domain?.examWeight ?? null,
    samples: questions.map((q) => ({
      questionText: q.question_text,
      options: q.options.map((o) => o.text),
      correctIndex: q.correct_index,
      explanation: q.explanation,
    })),
    siblings,
  };
}
