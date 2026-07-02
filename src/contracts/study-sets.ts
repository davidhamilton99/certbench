import { z } from "zod";
import type { EndpointContract } from "./common";
import { studyQuestionInput } from "@/core/study-materials/validate";

/** A study question as served to the (owner or public) player/editor. */
export const studyQuestion = z.object({
  id: z.uuid(),
  question_type: z.enum([
    "multiple_choice",
    "true_false",
    "multiple_select",
    "ordering",
    "matching",
  ]),
  question_text: z.string(),
  options: z.array(z.unknown()),
  correct_index: z.number().int(),
  explanation: z.string().nullable(),
  sort_order: z.number().int(),
});
export type StudyQuestion = z.infer<typeof studyQuestion>;

export const createStudySet = {
  path: "/api/study-sets/create",
  method: "POST",
  input: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullish(),
    category: z.string().trim().max(60).nullish(),
    sourcePreview: z.string().max(500).nullish(),
    questions: z.array(studyQuestionInput).min(1).max(100),
  }),
  output: z.object({ setId: z.uuid() }),
} as const satisfies EndpointContract;

export const updateStudySet = {
  path: "/api/study-sets/update",
  method: "POST",
  input: z.object({
    setId: z.uuid(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isPublic: z.boolean().optional(),
  }),
  output: z.object({ updated: z.boolean() }),
} as const satisfies EndpointContract;

export const deleteStudySet = {
  path: "/api/study-sets/delete",
  method: "POST",
  input: z.object({ setId: z.uuid() }),
  output: z.object({ deleted: z.boolean() }),
} as const satisfies EndpointContract;

export const upsertStudyQuestion = {
  path: "/api/study-sets/question",
  method: "POST",
  input: z.object({
    setId: z.uuid(),
    /** Omitted for new questions. */
    questionId: z.uuid().nullish(),
    question: studyQuestionInput,
  }),
  output: z.object({ questionId: z.uuid() }),
} as const satisfies EndpointContract;

export const deleteStudyQuestion = {
  path: "/api/study-sets/question/delete",
  method: "POST",
  input: z.object({ setId: z.uuid(), questionId: z.uuid() }),
  output: z.object({ deleted: z.boolean() }),
} as const satisfies EndpointContract;

/** Cross-device resume for study-set practice (study_set_progress). */
export const saveSetProgress = {
  path: "/api/study-sets/progress",
  method: "POST",
  input: z.object({
    setId: z.uuid(),
    currentIndex: z.number().int().min(0),
    correctCount: z.number().int().min(0),
    totalQuestions: z.number().int().min(1),
  }),
  output: z.object({ saved: z.boolean() }),
} as const satisfies EndpointContract;

export const clearSetProgress = {
  path: "/api/study-sets/progress/clear",
  method: "POST",
  input: z.object({ setId: z.uuid() }),
  output: z.object({ cleared: z.boolean() }),
} as const satisfies EndpointContract;
