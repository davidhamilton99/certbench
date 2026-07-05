import "server-only";

import { createAnonClient } from "@/server/supabase/anon";
import {
  getCertificationBySlug,
  listDomains,
  type CertDomain,
  type Certification,
} from "@/server/data/certifications";
import {
  countActiveQuestions,
  listSampleQuestions,
} from "@/server/data/questions";

const SAMPLE_COUNT = 6;

export interface PracticeTestData {
  certs: { cert: Certification; domains: CertDomain[] }[];
  totalQuestions: number;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

/** Loads everything a public practice-test page renders (anon client → ISR-safe). */
export async function loadPracticeTestData(
  certSlugs: string[]
): Promise<PracticeTestData> {
  const db = createAnonClient();
  const perCert = Math.ceil(SAMPLE_COUNT / certSlugs.length);

  const certs = (
    await Promise.all(certSlugs.map((s) => getCertificationBySlug(db, s)))
  ).flatMap((c) => (c ? [c] : []));

  const [counts, domainLists, sampleLists] = await Promise.all([
    Promise.all(certs.map((c) => countActiveQuestions(db, c.id))),
    Promise.all(certs.map((c) => listDomains(db, c.id))),
    Promise.all(certs.map((c) => listSampleQuestions(db, c.id, perCert))),
  ]);

  return {
    certs: certs.map((cert, i) => ({ cert, domains: domainLists[i] })),
    totalQuestions: counts.reduce((a, b) => a + b, 0),
    samples: sampleLists
      .flat()
      .slice(0, SAMPLE_COUNT)
      .map((q) => ({
        questionText: q.question_text,
        options: q.options.map((o) => o.text),
        correctIndex: q.correct_index,
        explanation: q.explanation,
      })),
  };
}
