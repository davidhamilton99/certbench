import { CHECKPOINT_SIZE } from "./plan";
import { finishStop, recordRep } from "./progress";
import { addRehearsal } from "./rehearsal";
import { parseRepId } from "./rep-id";
import type { ChoiceRep, PathProgress, RehearsalResult } from "./types";

/** How long a practice exam on this device stays worth bringing onto the path. */
export const EXAM_IMPORT_DAYS = 14;

/** One answer from a practice exam, as the path records answers. */
export interface ExamAnswer {
  repId: string;
  correct: boolean;
}

/**
 * The answers and result of a practice exam finished on a public page, when
 * they're worth bringing onto the path: enough answered to read readiness
 * from (at least a checkpoint's worth), and recent. Only answers the path can
 * place come along: bank questions and the path's own reps, by their ids.
 */
export function examToImport(
  run: { reps: readonly ChoiceRep[]; picks: readonly (number | null)[]; done: { result: RehearsalResult } | null },
  now: number
): { answers: ExamAnswer[]; result: RehearsalResult } | null {
  const result = run.done?.result;
  if (!result || result.answered < CHECKPOINT_SIZE) return null;
  if (now - result.at > EXAM_IMPORT_DAYS * 86_400_000 || result.at > now + 60_000) return null;
  const answers = run.reps.flatMap((rep, i) => {
    const pick = run.picks[i];
    if (pick === null || pick === undefined || !parseRepId(rep.id)) return [];
    return [{ repId: rep.id, correct: pick === rep.answer }];
  });
  return { answers, result };
}

/**
 * A practice exam sat on a public page, brought onto the path. Its answers
 * count, so what it missed comes back in later stops, and it's kept with the
 * rehearsals. When the path has no checkpoint yet, it stands in for one: a
 * full exam reads readiness better than the checkpoint's dozen questions, so
 * the reveal and the offer can follow it straight away. Bringing the same
 * exam (by when it finished) twice changes nothing.
 */
export function importExam(
  progress: PathProgress,
  answers: readonly ExamAnswer[],
  result: RehearsalResult
): { progress: PathProgress; asCheckpoint: boolean } {
  if (progress.rehearsals.some((r) => r.at === result.at)) return { progress, asCheckpoint: false };
  let p = progress;
  for (const a of answers) p = recordRep(p, a.repId, a.correct, result.at);
  p = addRehearsal(p, result);
  if (p.checkpoint) return { progress: p, asCheckpoint: false };
  const correct = result.domains.reduce((n, d) => n + d.correct, 0);
  p = finishStop(p, "checkpoint", correct, result.total, result.at);
  return {
    progress: { ...p, checkpoint: { score: result.score, at: result.at, domains: result.domains } },
    asCheckpoint: true,
  };
}

/** Whether the path's checkpoint reading came from a practice exam it brought in. */
export function checkpointFromExam(progress: Pick<PathProgress, "checkpoint" | "rehearsals">): boolean {
  const at = progress.checkpoint?.at;
  return at !== undefined && progress.rehearsals.some((r) => r.at === at);
}
