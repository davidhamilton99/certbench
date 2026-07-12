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

const SAMPLE_COUNT = 10;

export interface SampleQuestionItem {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SampleGroup {
  certName: string;
  examCode: string;
  questions: SampleQuestionItem[];
}

export interface PracticeTestData {
  certs: { cert: Certification; domains: CertDomain[] }[];
  totalQuestions: number;
  /** One group per cert (A+ pages get a Core 1 and a Core 2 section). */
  sampleGroups: SampleGroup[];
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
    sampleGroups: certs.map((cert, i) => ({
      certName: cert.name,
      examCode: cert.examCode,
      questions: sampleLists[i].map((q) => ({
        questionText: q.question_text,
        options: q.options.map((o) => o.text),
        correctIndex: q.correct_index,
        explanation: q.explanation,
      })),
    })),
  };
}
