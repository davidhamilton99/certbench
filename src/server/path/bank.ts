import "server-only";

import { z } from "zod";
import { afterResponse } from "@/server/api/after-response";
import { createAnonClient } from "@/server/supabase/anon";
import {
  getCertificationBySlug,
  listDomains,
  listSubObjectives,
} from "@/server/data/certifications";
import { allRows } from "@/server/data/paging";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { pbqClosingLabs, pbqRegistry } from "@/data/pbq";
import { domainLab, labLibrary } from "@/core/path/labs";
import { repairText, wordCount } from "@/core/path/text";
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

interface BankRow {
  id: string;
  domain_id: string;
  sub_objective_id: string | null;
  question_text: string;
  options: unknown;
  correct_index: number;
  explanation: string;
}

async function fetchBank(slug: PathCert): Promise<PathBank | null> {
  const db = createAnonClient();
  const cert = await getCertificationBySlug(db, slug);
  if (!cert) return null;

  const [domains, subs] = await Promise.all([
    listDomains(db, cert.id),
    listSubObjectives(db, cert.id),
  ]);

  // More than one page for the largest bank: see allRows.
  const rows = await allRows<BankRow>((from, to) =>
    db
      .from("cert_questions")
      .select("id, domain_id, sub_objective_id, question_text, options, correct_index, explanation")
      .eq("certification_id", cert.id)
      .eq("is_active", true)
      .order("id")
      .range(from, to)
  );

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
      lab: domainLab(pbqRegistry[slug] ?? [], d.domainNumber, pbqClosingLabs[slug]?.[d.domainNumber]),
    })),
    library: labLibrary(pbqRegistry[slug] ?? []),
  };

  const questions: BankQuestion[] = [];
  for (const r of rows) {
    const parsed = optionsSchema.safeParse(r.options);
    const domain = domainNumber.get(r.domain_id);
    if (!parsed.success || !domain) continue;
    // Shown as written, apart from the house style for dashes (see repairText).
    const options = parsed.data.map((o) => repairText(o.text));
    if (r.correct_index < 0 || r.correct_index >= options.length) continue;
    const text = repairText(r.question_text);
    questions.push({
      id: r.id,
      objective: (r.sub_objective_id && subCode.get(r.sub_objective_id)) || domain,
      domain,
      text,
      options,
      answer: r.correct_index,
      explanation: repairText(r.explanation ?? ""),
      words: wordCount(text),
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
 * Each server instance holds the bank of every exam it has been asked for. A
 * bank is several hundred questions, about a megabyte: too big for an entry
 * in Next's data cache, small enough to keep in memory.
 *
 * A held bank is always what a request is given, at once. When it is more
 * than an hour old (the study path page's own lifetime) a fresh copy is read
 * after the response has gone, and takes its place when it arrives. So only
 * the first request on a new instance ever waits for the download, and a
 * database fault during a refresh costs nothing: the bank already held stays.
 * A first load that fails throws, so that a page being rebuilt keeps its last
 * good copy instead of being rebuilt without its questions.
 */
const FRESH_FOR_MS = 60 * 60 * 1000;
/** After a refresh that failed, how long before the next one is tried. */
const RETRY_AFTER_MS = 60 * 1000;

/** A bank in memory, and the time from which a fresh copy is due. */
const held = new Map<PathCert, { bank: PathBank; refreshFrom: number }>();
/** Loads in flight, so that requests arriving together share one download. */
const loading = new Map<PathCert, Promise<PathBank | null>>();
/** Exams whose refresh has been asked for and has not finished. */
const refreshing = new Set<PathCert>();

export function loadPathBank(slug: PathCert): Promise<PathBank | null> {
  const hit = held.get(slug);
  if (!hit) return load(slug);
  if (Date.now() >= hit.refreshFrom) refreshLater(slug);
  return Promise.resolve(hit.bank);
}

/** Reads the bank and holds it. An exam the database does not have (null) is not held. */
function load(slug: PathCert): Promise<PathBank | null> {
  const pending = loading.get(slug);
  if (pending) return pending;

  const started = Date.now();
  const fresh = fetchBank(slug)
    .then((bank) => {
      if (bank) held.set(slug, { bank, refreshFrom: Date.now() + FRESH_FOR_MS });
      else held.delete(slug);
      // One line for each load, so the cost of a cold instance shows in the logs.
      console.info(
        `[path bank] ${slug}: ${bank ? `${bank.questions.length} questions` : "not found"}, read in ${Date.now() - started} ms`
      );
      return bank;
    })
    .finally(() => {
      loading.delete(slug);
    });
  loading.set(slug, fresh);
  return fresh;
}

/** Replaces a held bank once the response has gone. A failure keeps the bank already held. */
function refreshLater(slug: PathCert): void {
  if (refreshing.has(slug)) return;
  refreshing.add(slug);
  afterResponse(async () => {
    try {
      await load(slug);
    } catch (err) {
      console.warn(`[path bank] ${slug}: the refresh failed; the bank already held stays in use`, err);
      const hit = held.get(slug);
      if (hit) held.set(slug, { bank: hit.bank, refreshFrom: Date.now() + RETRY_AFTER_MS });
    } finally {
      refreshing.delete(slug);
    }
  });
}

/** For tests: forget every held bank. */
export function forgetPathBanks(): void {
  held.clear();
  loading.clear();
  refreshing.clear();
}
