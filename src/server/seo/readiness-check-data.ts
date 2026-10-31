import "server-only";

import { createAnonClient } from "@/server/supabase/anon";
import {
  getCertificationBySlug,
  listActiveCertifications,
  listDomains,
} from "@/server/data/certifications";
import { listDiagnosticQuestions } from "@/server/data/questions";
import {
  allocateSlots,
  type CheckQuestion,
} from "@/lib/tools/readiness-estimate";

const CHECK_QUESTION_COUNT = 10;

export interface ReadinessCheckData {
  certSlug: string;
  certName: string;
  shortCertName: string;
  examCode: string;
  objectiveCount: number;
  questions: CheckQuestion[];
}

/** Cert slugs that get a readiness-check page (static params). */
export async function listReadinessCheckCerts(): Promise<{ cert: string }[]> {
  const db = createAnonClient();
  const certs = await listActiveCertifications(db);
  return certs.map((c) => ({ cert: c.slug }));
}

const words = (text: string) => text.trim().split(/\s+/).length;

/**
 * Quick to read: a question of 30 words or fewer with short options. Visitors
 * leave at walls of text, so the check leads with these and only falls back
 * to longer questions when a domain runs out.
 */
const readable = (q: { question_text: string; options: { text: string }[] }) =>
  words(q.question_text) <= 30 && q.options.every((o) => words(o.text) <= 12);

/**
 * A stable, domain-weight-balanced 10-question sample for the public
 * readiness check, shortest and most readable first. Stable (ordered by
 * length, then id) so the page content doesn't churn between ISR
 * revalidations.
 */
export async function loadReadinessCheck(
  certSlug: string
): Promise<ReadinessCheckData | null> {
  const db = createAnonClient();
  const cert = await getCertificationBySlug(db, certSlug);
  if (!cert) return null;

  const [domains, pool] = await Promise.all([
    listDomains(db, cert.id),
    listDiagnosticQuestions(db, cert.id),
  ]);
  if (domains.length === 0 || pool.length === 0) return null;

  const slots = allocateSlots(
    domains.map((d) => d.examWeight),
    CHECK_QUESTION_COUNT
  );

  const questions: CheckQuestion[] = [];
  domains.forEach((domain, i) => {
    const domainPool = pool
      .filter((q) => q.domain_id === domain.id)
      .sort(
        (a, b) =>
          Number(readable(b)) - Number(readable(a)) ||
          words(a.question_text) - words(b.question_text) ||
          (a.id < b.id ? -1 : 1)
      );
    for (const q of domainPool.slice(0, slots[i])) {
      questions.push({
        questionText: q.question_text,
        options: q.options.map((o) => o.text),
        correctIndex: q.correct_index,
        explanation: q.explanation,
        domainTitle: domain.title,
        examWeight: domain.examWeight,
      });
    }
  });

  // Sub-objective count for the CTA copy ("tracks all N objectives").
  const { count } = await db
    .from("cert_sub_objectives")
    .select("id", { count: "exact", head: true })
    .in(
      "domain_id",
      domains.map((d) => d.id)
    );

  return {
    certSlug: cert.slug,
    certName: cert.name,
    shortCertName: cert.name.replace(/^CompTIA\s+/, ""),
    examCode: cert.examCode,
    objectiveCount: count ?? 0,
    questions,
  };
}
