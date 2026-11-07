import { z } from "zod";
import type { EndpointContract } from "@/contracts/common";
import { PATH_CERTS } from "@/core/path/types";
import type { PbqScenario } from "@/data/pbq/types";
import {
  MAX_MISSED_SENT,
  MAX_PATH_ITEMS,
  MAX_PATH_LABS,
  MAX_PATH_STOPS,
  MAX_SEEN_SENT,
} from "@/core/path/progress";
import { MAX_REHEARSALS } from "@/core/path/rehearsal";

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
    order: z.array(count).optional(),
    mono: z.boolean().optional(),
  }),
  z.object({
    ...repBase,
    type: z.literal("typed"),
    accept: z.array(z.string()).min(1),
    answerText: z.string(),
    numeric: z.boolean().optional(),
    answerKind: z.enum(["binary", "dotted", "cidr", "count"]).optional(),
    placeholder: z.string().optional(),
    explanation: z.string().optional(),
  }),
]);

const rehearsalSizeSchema = z.enum(["full", "half"]);

/** How often a stop or lab was finished, and its latest score. */
const runSchema = z.object({ n: count, c: count, t: count, at: count });

/** A checkpoint's or rehearsal's score, with how each domain went. */
const scoreSchema = z.object({
  score: count.max(100),
  at: count,
  domains: z.array(z.object({ number: z.string().max(8), correct: count, total: count })).max(12),
});

export const stopSchema = z.object({
  id: z.string(),
  index: count,
  kind: z.enum(["warmup", "learn", "checkpoint", "practice", "lab", "rehearsal", "review"]),
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
    .record(z.string().min(1).max(32), runSchema)
    .refine((stops) => Object.keys(stops).length <= MAX_PATH_STOPS, {
      message: `At most ${MAX_PATH_STOPS} stops`,
    }),
  checkpoint: scoreSchema.nullable(),
  /** Absent from progress saved before rehearsals existed. */
  rehearsals: z
    .array(
      scoreSchema.extend({
        size: rehearsalSizeSchema,
        answered: count,
        total: count.max(200),
        seconds: count.max(86_400),
      })
    )
    .max(MAX_REHEARSALS)
    .default([]),
  /** Labs played, by scenario id. Absent from progress saved before the library. */
  labs: z
    .record(z.string().min(1).max(64), runSchema)
    .refine((labs) => Object.keys(labs).length <= MAX_PATH_LABS, {
      message: `At most ${MAX_PATH_LABS} labs`,
    })
    .default({}),
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
 * server needing stored progress. `retired` lists sent misses that can never
 * come back (their content was withdrawn), for the client to clear.
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
  output: z.object({
    stop: stopSchema,
    reps: z.array(repSchema),
    retired: z.array(repIdSchema).max(MAX_MISSED_SENT).default([]),
    /**
     * A lab stop's PBQ scenario. Passed through as built: it's our own static
     * data, typed by src/data/pbq, and too varied to restate here.
     */
    lab: z.custom<PbqScenario>((v) => typeof v === "object" && v !== null && "type" in v).optional(),
  }),
} as const satisfies EndpointContract;

/**
 * One lab from the exam's library, to play on the path: any of its PBQ
 * scenarios, not only the one closing a domain. Pro on this exam only (401 /
 * 402 otherwise), like every lab.
 */
export const getPathLab = {
  path: "/api/path/lab",
  method: "POST",
  input: z.object({
    cert: certSchema,
    id: z.string().min(1).max(64),
  }),
  output: z.object({
    /** Our own static data, typed by src/data/pbq; passed through as built. */
    lab: z.custom<PbqScenario>((v) => typeof v === "object" && v !== null && "type" in v),
  }),
} as const satisfies EndpointContract;

/**
 * Draw an exam rehearsal: questions from every domain in the exam's weights,
 * ones not seen yet first, mixed like the real thing. Pro on this exam only
 * (401 / 402 otherwise). The browser keeps the run and grades it at the end.
 */
export const getPathRehearsal = {
  path: "/api/path/rehearsal",
  method: "POST",
  input: z.object({
    cert: certSchema,
    size: rehearsalSizeSchema,
    seen: z.array(repIdSchema).max(MAX_SEEN_SENT).default([]),
    /** Which rehearsal this is: each one draws afresh. */
    run: count.max(1_000_000).default(0),
  }),
  output: z.object({
    reps: z.array(repSchema).max(120),
    minutes: count,
  }),
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
 * Make this exam the account's exam (and set the date when given). A free
 * account studies one exam at a time, so its single enrollment moves to the
 * path it's on — which is the exam Pro will unlock when they buy. A Pro
 * account's enrollments only change by purchase; for an exam they haven't
 * added, `enrolled` comes back false.
 */
export const enrollInPath = {
  path: "/api/path/enroll",
  method: "POST",
  input: z.object({
    cert: certSchema,
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  output: z.object({ enrolled: z.boolean() }),
} as const satisfies EndpointContract;

/**
 * Record answers to bank questions from a finished stop or rehearsal, so they
 * count toward the user's readiness score and spaced repetition like any
 * practice answer. The server grades them itself.
 */
export const recordPathAnswers = {
  path: "/api/path/answers",
  method: "POST",
  input: z.object({
    cert: certSchema,
    answers: z
      .array(z.object({ questionId: z.uuid(), selectedIndex: z.number().int().min(0).max(9) }))
      .min(1)
      // A full rehearsal's answers, in one go.
      .max(120),
  }),
  output: z.object({ ok: z.literal(true) }),
} as const satisfies EndpointContract;
