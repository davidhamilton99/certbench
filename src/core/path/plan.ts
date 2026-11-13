import type { PathDomain, PathPlan, PathStop, PathStructure } from "./types";

/**
 * Learn stops before the readiness checkpoint. With the warm-up first, the
 * checkpoint lands at stop 6 (index 5) — about twenty minutes in, and the end
 * of what a free account can open. A first domain shorter than this puts its
 * practice stop first: A+ Core 1's three-objective domain moves it to stop 7.
 */
export const LEARN_BEFORE_CHECKPOINT = 4;

/** New reps in a learn stop, before the exam-style rep that closes it. */
export const LEARN_NEW_REPS = 7;
/** Questions in a domain practice stop and in a keep-practicing round. */
export const PRACTICE_SIZE = 10;
/** Questions in the readiness checkpoint. */
export const CHECKPOINT_SIZE = 12;
/** Earlier misses brought back at the start of a stop. */
export const MAX_RESURFACED = 2;
/** Rough minutes one stop takes, for projections. */
export const MINUTES_PER_STOP = 4;

const domainLabel = (number: string) => number.replace(/\.0$/, "");

/**
 * The stops of an exam's path, in order:
 *
 *   warm-up → a learn stop per objective, domain by domain, with a practice
 *   stop and then a hands-on lab closing each domain, and the readiness
 *   checkpoint after the fourth learn stop → the exam rehearsal.
 *
 * Every learn stop teaches one objective. Practice stops and the checkpoint are
 * the real exam's wording; a lab is one of the exam's PBQ scenarios. Labs are
 * Pro, so none comes before the checkpoint: a domain that ends sooner has its
 * lab right after it. The path ends on a timed rehearsal of the whole exam
 * (see rehearsal.ts). After that it keeps going with review rounds (see
 * `reviewStop`), so it never dead-ends.
 */
export function buildPlan(structure: PathStructure): PathPlan {
  const stops: PathStop[] = [];
  const push = (stop: Omit<PathStop, "index">) => stops.push({ ...stop, index: stops.length });
  const pushLab = (domain: PathDomain) => {
    if (!domain.lab) return;
    push({
      id: `lab${domainLabel(domain.number)}`,
      kind: "lab",
      title: domain.lab.title,
      domain: domain.number,
      objectives: [],
    });
  };

  push({ id: "warmup", kind: "warmup", title: "Warm-up", domain: null, objectives: [] });

  let learned = 0;
  let freeThrough = -1;
  const waitingLabs: PathDomain[] = [];
  const allObjectives = structure.domains.flatMap((d) => d.objectives.map((o) => o.code));
  const pushCheckpoint = () => {
    push({
      id: "checkpoint",
      kind: "checkpoint",
      title: "Readiness checkpoint",
      domain: null,
      objectives: allObjectives,
    });
    freeThrough = stops.length - 1;
    waitingLabs.splice(0).forEach(pushLab);
  };

  for (const domain of structure.domains) {
    domain.objectives.forEach((objective, i) => {
      push({
        id: objective.code,
        kind: "learn",
        title: objective.title,
        domain: domain.number,
        objectives: [objective.code],
      });
      learned++;
      if (learned === LEARN_BEFORE_CHECKPOINT) pushCheckpoint();
      if (i === domain.objectives.length - 1) {
        push({
          id: `d${domainLabel(domain.number)}`,
          kind: "practice",
          title: `Domain ${domainLabel(domain.number)} practice`,
          domain: domain.number,
          objectives: domain.objectives.map((o) => o.code),
        });
        if (freeThrough < 0) waitingLabs.push(domain);
        else pushLab(domain);
      }
    });
  }

  // An exam with fewer objectives than the checkpoint threshold still gets one.
  if (freeThrough < 0) pushCheckpoint();

  push({
    id: "rehearsal",
    kind: "rehearsal",
    title: "Exam rehearsal",
    domain: null,
    objectives: allObjectives,
  });

  return { stops, freeThrough };
}

/** The open-ended round that follows the last stop: misses, then weak spots. */
export function reviewStop(plan: PathPlan, structure: PathStructure): PathStop {
  return {
    id: "review",
    index: plan.stops.length,
    kind: "review",
    title: "Keep practicing",
    domain: null,
    objectives: structure.domains.flatMap((d) => d.objectives.map((o) => o.code)),
  };
}

/** The stop at `index`: a planned stop, or a review round past the end. */
export function stopAt(plan: PathPlan, structure: PathStructure, index: number): PathStop | null {
  if (!Number.isSafeInteger(index) || index < 0) return null;
  return plan.stops[index] ?? reviewStop(plan, structure);
}

/** Whether a free account (or, for index 0, anyone) may open this stop. */
export function isFreeStop(plan: PathPlan, index: number): boolean {
  return index <= plan.freeThrough;
}
