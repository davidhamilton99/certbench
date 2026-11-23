import "server-only";

import { z } from "zod";
import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { CertQuestion, QuestionOption } from "@/core/question-selection/types";
import { repairText, withoutAnswerLead } from "@/core/path/text";
import { allRows } from "@/server/data/paging";

/** Runtime guard for the options JSONB column. */
const optionsSchema = z.array(
  z.object({ text: z.string(), is_correct: z.boolean() })
);

interface QuestionRow {
  id: string;
  certification_id: string;
  domain_id: string;
  sub_objective_id: string | null;
  question_text: string;
  options: unknown;
  correct_index: number;
  explanation: string;
  difficulty: number;
}

const QUESTION_COLUMNS =
  "id, certification_id, domain_id, sub_objective_id, question_text, options, correct_index, explanation, difficulty";

function mapQuestion(row: QuestionRow): CertQuestion {
  const parsed = optionsSchema.safeParse(row.options);
  if (!parsed.success) {
    // A malformed options payload is a data bug worth failing loudly on.
    throw new ApiError("internal", `Malformed options JSON on question ${row.id}`);
  }
  return {
    id: row.id,
    certification_id: row.certification_id,
    domain_id: row.domain_id,
    sub_objective_id: row.sub_objective_id,
    // Shown as written, apart from the house style for dashes (see repairText).
    question_text: repairText(row.question_text),
    options: parsed.data.map((o) => ({ ...o, text: repairText(o.text) })) as QuestionOption[],
    correct_index: row.correct_index,
    // Without the lead that names the answer by its letter ("Why B is
    // correct:"): the screens that print a whole explanation show the answers
    // in another order, or with no letters, and the lead would point wrongly.
    explanation: withoutAnswerLead(repairText(row.explanation ?? "")),
    difficulty: row.difficulty,
  };
}

/*
 * The selects below that take every question of an exam are read a page at a
 * time (allRows), in id order: one select answers with at most 1,000 rows, and
 * a bank can hold more. Each asks for the exact count with its page, which is
 * how allRows knows that it has every row without asking once more.
 * src/__tests__/whole-exam-selects.test.ts keeps it so, and reads the count
 * where it is written: beside the columns, never through a constant.
 */

/** All active questions for a cert, which feed the selection algorithms. */
export async function listActiveQuestions(
  db: Db,
  certId: string
): Promise<CertQuestion[]> {
  const rows = await allRows<QuestionRow>((from, to) =>
    db
      .from("cert_questions")
      .select(QUESTION_COLUMNS, { count: "exact" })
      .eq("certification_id", certId)
      .eq("is_active", true)
      .order("id")
      .range(from, to)
  );
  return rows.map(mapQuestion);
}

/** Active diagnostic-eligible questions for a cert. */
export async function listDiagnosticQuestions(
  db: Db,
  certId: string
): Promise<CertQuestion[]> {
  const rows = await allRows<QuestionRow>((from, to) =>
    db
      .from("cert_questions")
      .select(QUESTION_COLUMNS, { count: "exact" })
      .eq("certification_id", certId)
      .eq("is_active", true)
      .eq("is_diagnostic_eligible", true)
      .order("id")
      .range(from, to)
  );
  return rows.map(mapQuestion);
}

/** Fetch specific questions by id (grading, SRS cards, review). */
export async function getQuestionsByIds(
  db: Db,
  ids: string[]
): Promise<CertQuestion[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("cert_questions")
    .select(QUESTION_COLUMNS)
    .in("id", ids);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapQuestion);
}

/**
 * The answer key for some of one exam's active questions: which option is
 * correct for each id given. Ids from another exam, retired questions and ids
 * that do not exist are simply absent from the answer. For grading answers
 * without reading the whole bank.
 */
export async function listAnswerKeys(
  db: Db,
  certId: string,
  ids: string[]
): Promise<{ id: string; correct_index: number }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("cert_questions")
    .select("id, correct_index")
    .eq("certification_id", certId)
    .eq("is_active", true)
    .in("id", ids);
  if (error) throw new ApiError("internal", error.message);
  return data ?? [];
}

/**
 * Every question of an exam with the domain it belongs to, retired questions
 * included (a member's history can hold answers to them). For readiness and
 * session planning, which total answers by domain.
 */
export async function listQuestionDomains(
  db: Db,
  certId: string
): Promise<{ id: string; domain_id: string; is_active: boolean }[]> {
  return allRows<{ id: string; domain_id: string; is_active: boolean }>((from, to) =>
    db
      .from("cert_questions")
      .select("id, domain_id, is_active", { count: "exact" })
      .eq("certification_id", certId)
      .order("id")
      .range(from, to)
  );
}

/** question id -> sub_objective id map for a cert (analytics rollups). */
export async function getQuestionSubObjectiveMap(
  db: Db,
  certId: string
): Promise<Map<string, string>> {
  const rows = await allRows<{ id: string; sub_objective_id: string | null }>((from, to) =>
    db
      .from("cert_questions")
      .select("id, sub_objective_id", { count: "exact" })
      .eq("certification_id", certId)
      .not("sub_objective_id", "is", null)
      .order("id")
      .range(from, to)
  );
  return new Map(rows.map((q) => [q.id, q.sub_objective_id as string]));
}

/**
 * A small, STABLE sample of questions for the public practice-test pages.
 * Ordered by id so the page content doesn't churn between crawls.
 */
export async function listSampleQuestions(
  db: Db,
  certId: string,
  count: number
): Promise<CertQuestion[]> {
  const { data, error } = await db
    .from("cert_questions")
    .select(QUESTION_COLUMNS)
    .eq("certification_id", certId)
    .eq("is_active", true)
    .order("id")
    .limit(count);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapQuestion);
}

export async function countActiveQuestions(db: Db, certId: string): Promise<number> {
  const { count, error } = await db
    .from("cert_questions")
    .select("id", { count: "exact", head: true })
    .eq("certification_id", certId)
    .eq("is_active", true);
  if (error) throw new ApiError("internal", error.message);
  return count ?? 0;
}

/** Active questions tagged to a sub-objective (stable id order), for objective pages. */
export async function listQuestionsBySubObjective(
  db: Db,
  subObjectiveId: string,
  limit: number
): Promise<CertQuestion[]> {
  const { data, error } = await db
    .from("cert_questions")
    .select(QUESTION_COLUMNS)
    .eq("sub_objective_id", subObjectiveId)
    .eq("is_active", true)
    .order("id")
    .limit(limit);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapQuestion);
}

/** sub_objective_id → active question count for a cert (objective-page gating). */
export async function countQuestionsBySubObjective(
  db: Db,
  certId: string
): Promise<Map<string, number>> {
  const rows = await allRows<{ sub_objective_id: string | null }>((from, to) =>
    db
      .from("cert_questions")
      .select("sub_objective_id", { count: "exact" })
      .eq("certification_id", certId)
      .eq("is_active", true)
      .not("sub_objective_id", "is", null)
      .order("id")
      .range(from, to)
  );
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = row.sub_objective_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
