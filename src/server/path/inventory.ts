import "server-only";

import type { InventoryRow } from "@/core/path/inventory-types";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { PathCert, PathStructure } from "@/core/path/types";
import { EXAM_CODES } from "@/core/path/versions";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { pbqRegistry } from "@/data/pbq";
import { practicePageFor } from "@/lib/seo/cert-pages";
import {
  SECURITY_PLUS_DOMAIN_CHANGES,
  SY0_801_PRACTICE_PATH,
  usesOfficialObjectiveNumbers,
} from "@/lib/seo/exam-versions";
import { getCertificationBySlug } from "@/server/data/certifications";
import { countActiveQuestions } from "@/server/data/questions";
import { loadPathBank } from "@/server/path/bank";
import { createAnonClient } from "@/server/supabase/anon";

/** The exams in the order the table lists them: the newest Security+ first. */
const TABLE_ORDER: PathCert[] = [
  "security-plus-sy0-801",
  "security-plus-sy0-701",
  "network-plus-n10-009",
  "a-plus-core1-220-1201",
  "a-plus-core2-220-1202",
];

const FULL = REHEARSAL_FORMATS.full;

/**
 * What CertBench holds for each exam: the table on the home page and on the
 * page for educators.
 *
 * The questions are counted where they are kept, with a count query that sends
 * no rows back. (The table used to download every question of all five exams
 * to print five numbers.) The figure is the number of active questions in the
 * exam's bank.
 *
 * A read that fails throws. The pages that show this table are rebuilt on a
 * timer, and a page that throws while it is rebuilt keeps its last good copy
 * and is tried again; a page that rendered without its figures would replace
 * the good copy until the next rebuild. The count is null only for an exam
 * that is not in the database, which is a state of the data and not a fault.
 */
export async function examInventory(): Promise<InventoryRow[]> {
  const db = createAnonClient();
  return Promise.all(
    TABLE_ORDER.map(async (cert) => {
      const exam = await getCertificationBySlug(db, cert);
      const questions = exam ? await countActiveQuestions(db, exam.id) : null;
      const count = Object.keys(OBJECTIVE_TITLES[cert]).length;
      return {
        cert,
        name: EXAM_NAMES[cert],
        code: EXAM_CODES[cert],
        questions,
        objectives: `${count} ${usesOfficialObjectiveNumbers(cert) ? "objectives" : "topics"}`,
        labs: (pbqRegistry[cert] ?? []).length,
        exam: {
          href: cert === "security-plus-sy0-801" ? SY0_801_PRACTICE_PATH : practicePageFor(cert),
          label: `${FULL.questions} questions in ${FULL.minutes} minutes`,
        },
        path: `/path/${cert}`,
      };
    })
  );
}

/**
 * CompTIA's domain weights as they were last checked against its exam pages,
 * in domain order: the record in src/lib/seo/exam-versions.ts, which carries
 * the date of the check. The home page prints that date beside its exam facts,
 * so the weights it shows come from that record and from nowhere else.
 */
const CHECKED_WEIGHTS: Partial<Record<PathCert, number[]>> = {
  "security-plus-sy0-701": SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0701),
  "security-plus-sy0-801": SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801),
};

/**
 * One exam's structure as its study path draws it: CompTIA's domains under
 * their full names, every objective, and the exam's labs. The home page shows
 * its examples with it, so they are the product's own outline and not a copy
 * kept beside it.
 *
 * It is read from the bank, like the study path's. Where the checked record
 * above holds the exam's weights, they are the ones given, so the page does
 * not keep a second list of them; an exam the record does not hold keeps the
 * bank's weights. A failed read throws, and so does an exam that is missing,
 * for the reason given above: the page keeps its last good copy.
 */
export async function examStructure(cert: PathCert): Promise<PathStructure> {
  const bank = await loadPathBank(cert);
  if (!bank) throw new Error(`The exam ${cert} is not in the database.`);
  const weights = CHECKED_WEIGHTS[cert];
  // The record and the bank both list the domains in CompTIA's order. If they
  // ever disagree about how many there are, the bank's own weights stand.
  if (!weights || weights.length !== bank.structure.domains.length) return bank.structure;
  return {
    ...bank.structure,
    domains: bank.structure.domains.map((d, k) => ({ ...d, weight: weights[k] })),
  };
}
