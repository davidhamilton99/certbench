import "server-only";

import { z } from "zod";
import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { CertQuestion, QuestionOption } from "@/core/question-selection/types";

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
    question_text: row.question_text,
    options: parsed.data as QuestionOption[],
    correct_index: row.correct_index,
    explanation: row.explanation,
    difficulty: row.difficulty,
  };
}

/** All active questions for a cert — feeds the selection algorithms. */
export async function listActiveQuestions(
  db: Db,
  certId: string
): Promise<CertQuestion[]> {
  const { data, error } = await db
    .from("cert_questions")
    .select(QUESTION_COLUMNS)
    .eq("certification_id", certId)
    .eq("is_active", true);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapQuestion);
}

/** Active diagnostic-eligible questions for a cert. */
export async function listDiagnosticQuestions(
  db: Db,
  certId: string
): Promise<CertQuestion[]> {
  const { data, error } = await db
    .from("cert_questions")
    .select(QUESTION_COLUMNS)
    .eq("certification_id", certId)
    .eq("is_active", true)
    .eq("is_diagnostic_eligible", true);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapQuestion);
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

export async function countActiveQuestions(db: Db, certId: string): Promise<number> {
  const { count, error } = await db
    .from("cert_questions")
    .select("id", { count: "exact", head: true })
    .eq("certification_id", certId)
    .eq("is_active", true);
  if (error) throw new ApiError("internal", error.message);
  return count ?? 0;
}
