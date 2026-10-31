import { z } from "zod";
import type { EndpointContract } from "@/contracts/common";
import { PATH_CERTS } from "@/core/path/types";
import {
  MAX_MISSED_SENT,
  MAX_PATH_ITEMS,
  MAX_PATH_STOPS,
  MAX_SEEN_SENT,
} from "@/core/path/progress";

const certSchema = z.enum(PATH_CERTS);
const repIdSchema = z.string().min(1).max(64);
const count = z.number().int().min(0);

const repBase = {
  id: repIdSchema,
  label: z.string(),
  tier: z.enum(["recall", "quick", "exam"]),
  objective: z.string(),
  prompt: z.string(),
  cue: z.string().optional(),
  takeaway: z.string(),
};

export const repSchema = z.discriminatedUnion("type", [
  z.object({
    ...repBase,
    type: z.literal("choice"),
    options: z.array(z.string()).min(2).max(6),
    answer: count,
    explanation: z.string().optional(),
    lettered: z.boolean().optional(),
    mono: z.boolean().optional(),
  }),
  z.object({
    ...repBase,
    type: z.literal("typed"),
    accept: z.array(z.string()).min(1),
    answerText: z.string(),
    numeric: z.boolean().optional(),
  }),
]);

export const stopSchema = z.object({
  id: z.string(),
  index: count,
  kind: z.enum(["warmup", "learn", "checkpoint", "practice", "review"]),
  title: z.string(),
  domain: z.string().nullable(),
  objectives: z.array(z.string()),
});

/** A path progress snapshot (see src/core/path/progress.ts). */
export const pathProgressSchema = z.object({
  items: z
    .record(repIdSchema, z.object({ a: count, c: count, s: count, t: count }))
    .refine((items) => Object.keys(items).length <= MAX_PATH_ITEMS, {
      message: `At most ${MAX_PATH_ITEMS} items`,
    }),
  stops: z
    .record(z.string().min(1).max(32), z.object({ n: count, c: count, t: count, at: count }))
    .refine((stops) => Object.keys(stops).length <= MAX_PATH_STOPS, {
      message: `At most ${MAX_PATH_STOPS} stops`,
    }),
  checkpoint: z
    .object({
      score: count.max(100),
      at: count,
      domains: z.array(z.object({ number: z.string().max(8), correct: count, total: count })).max(12),
    })
    .nullable(),
  goal: z
    .object({
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      target: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      minutes: count.max(600).nullable(),
      at: count,
    })
    .nullable(),
});

/**
 * Build one stop of a path. Public: anyone may open the warm-up; later stops
 * need an account, and stops past the free checkpoint need Pro on this exam
 * (401 / 402 otherwise). The client sends which reps it has seen and missed,
 * so the stop brings misses back and skips what's already done — without the
 * server needing stored progress.
 */
export const getPathStop = {
  path: "/api/path/stop",
  method: "POST",
  input: z.object({
    cert: certSchema,
    index: count.max(1000),
    seen: z.array(repIdSchema).max(MAX_SEEN_SENT).default([]),
    missed: z.array(repIdSchema).max(MAX_MISSED_SENT).default([]),
    /** Which run of this stop (replays reshuffle). */
    run: count.max(1_000_000).default(0),
  }),
  output: z.object({ stop: stopSchema, reps: z.array(repSchema) }),
} as const satisfies EndpointContract;

/**
 * Load the signed-in user's saved path for one exam, plus how much of it they
 * can open: `pro` (the whole path) or `free` (through the checkpoint).
 * `proPlan` marks a Pro subscriber on an exam they haven't added yet.
 */
export const getPathProgress = {
  path: "/api/path/progress",
  method: "GET",
  input: z.object({ cert: certSchema }),
  output: z.object({
    progress: pathProgressSchema,
    stored: z.boolean(),
    access: z.enum(["free", "pro"]),
    proPlan: z.boolean(),
    certId: z.string(),
  }),
} as const satisfies EndpointContract;

/**
 * Save path progress. The server merges it into what's stored (see
 * mergePathProgress), so a stale tab or second device can't erase newer work.
 * `stored: false` means saving isn't available yet; progress stays on the device.
 */
export const savePathProgress = {
  path: "/api/path/progress",
  method: "POST",
  input: z.object({ cert: certSchema, progress: pathProgressSchema }),
  output: z.object({ ok: z.literal(true), stored: z.boolean() }),
} as const satisfies EndpointContract;

/**
 * Record answers to bank questions from a finished stop, so they count toward
 * the user's readiness score and spaced repetition like any practice answer.
 * The server grades them itself.
 */
export const recordPathAnswers = {
  path: "/api/path/answers",
  method: "POST",
  input: z.object({
    cert: certSchema,
    answers: z
      .array(z.object({ questionId: z.uuid(), selectedIndex: z.number().int().min(0).max(9) }))
      .min(1)
      .max(40),
  }),
  output: z.object({ ok: z.literal(true) }),
} as const satisfies EndpointContract;
