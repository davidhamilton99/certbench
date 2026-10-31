import "server-only";

import { z } from "zod";
import { createAnonClient } from "@/server/supabase/anon";
import {
  getCertificationBySlug,
  listDomains,
  listSubObjectives,
} from "@/server/data/certifications";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { wordCount } from "@/core/path/text";
import type { PathCert, PathStructure } from "@/core/path/types";

/** One bank question, shaped for building path stops. */
export interface BankQuestion {
  id: string;
  /** Objective code ("1.1"), or the domain number when untagged. */
  objective: string;
  /** Domain number, e.g. "2.0". */
  domain: string;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
  /** Words in the question, and in its longest option. */
  words: number;
  optionWords: number;
}

export interface PathBank {
  certId: string;
  structure: PathStructure;
  questions: BankQuestion[];
  byId: Map<string, BankQuestion>;
}

const optionsSchema = z.array(z.object({ text: z.string() })).min(2).max(6);

/** Supabase caps an unranged select at 1,000 rows; page through instead. */
const PAGE = 1000;

async function fetchBank(slug: PathCert): Promise<PathBank | null> {
  const db = createAnonClient();
  const cert = await getCertificationBySlug(db, slug);
  if (!cert) return null;

  const [domains, subs] = await Promise.all([
    listDomains(db, cert.id),
    listSubObjectives(db, cert.id),
  ]);

  const rows: {
    id: string;
    domain_id: string;
    sub_objective_id: string | null;
    question_text: string;
    options: unknown;
    correct_index: number;
    explanation: string;
  }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("cert_questions")
      .select("id, domain_id, sub_objective_id, question_text, options, correct_index, explanation")
      .eq("certification_id", cert.id)
      .eq("is_active", true)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`path bank: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const titles = OBJECTIVE_TITLES[slug] ?? {};
  const domainNumber = new Map(domains.map((d) => [d.id, d.domainNumber]));
  const subCode = new Map(subs.map((s) => [s.id, s.code]));

  const structure: PathStructure = {
    certSlug: slug,
    examName: EXAM_NAMES[slug] ?? cert.name,
    examCode: cert.examCode,
    domains: domains.map((d) => ({
      number: d.domainNumber,
      title: d.title,
      weight: d.examWeight,
      objectives: subs
        .filter((s) => s.domain_id === d.id)
        .map((s) => ({ code: s.code, title: titles[s.code] ?? s.title })),
    })),
  };

  const questions: BankQuestion[] = [];
  for (const r of rows) {
    const parsed = optionsSchema.safeParse(r.options);
    const domain = domainNumber.get(r.domain_id);
    if (!parsed.success || !domain) continue;
    const options = parsed.data.map((o) => o.text);
    if (r.correct_index < 0 || r.correct_index >= options.length) continue;
    questions.push({
      id: r.id,
      objective: (r.sub_objective_id && subCode.get(r.sub_objective_id)) || domain,
      domain,
      text: r.question_text,
      options,
      answer: r.correct_index,
      explanation: r.explanation ?? "",
      words: wordCount(r.question_text),
      optionWords: Math.max(...options.map(wordCount)),
    });
  }

  return {
    certId: cert.id,
    structure,
    questions,
    byId: new Map(questions.map((q) => [q.id, q])),
  };
}

/**
 * Each instance keeps a bank for ten minutes. The bank is a few hundred
 * questions per exam — too big for Next's data cache, small enough for memory.
 */
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<PathCert, { at: number; bank: Promise<PathBank | null> }>();

export function loadPathBank(slug: PathCert): Promise<PathBank | null> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.bank;
  const bank = fetchBank(slug).catch((err) => {
    cache.delete(slug);
    throw err;
  });
  cache.set(slug, { at: Date.now(), bank });
  return bank;
}
