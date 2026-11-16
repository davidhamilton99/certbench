/**
 * A simulation lab played as a game rather than filled in as a form: each task
 * is a stage, and each field is one move, answered on its own and marked the
 * moment it's answered. The grading is the same as before: the moves' answers
 * go to gradeSimulationScenario at the end, so a lab reports the score it
 * always did, and each move's mark is gradeField's credit for that field.
 */

import type {
  SimDropdownField,
  SimField,
  SimFieldAnswer,
  SimSelectManyField,
  SimTask,
  SimTextInputField,
  SimZonePlacementField,
  TopoDevice,
  TopologyScenario,
} from "@/data/pbq/types";
import { gradeField } from "@/core/pbq/grade-field";
import { seedFromString, shuffleSeeded } from "@/core/pbq/shuffle";

/** "Task 1 — Diagnose the Display Issue" → "Diagnose the Display Issue". */
export function stageTitle(title: string): string {
  return title.replace(/^\s*task\s*\d+\s*[—–:-]\s*/i, "").trim() || title;
}

/**
 * A pick-all field's ask without the exam's "Select ALL … (select all that
 * apply)", since each option gets its own yes or no.
 * "Select ALL steps required to restore connectivity (select all that apply)"
 * → "Steps required to restore connectivity".
 */
export function callPrompt(label: string): string {
  const s = label
    .replace(/\(\s*(?:select|choose)\s+all\s+that\s+apply\s*\)/gi, "")
    .replace(/^\s*select\s+all\s+/i, "")
    .trim()
    .replace(/[\s:.]+$/, "");
  return s ? s[0].toUpperCase() + s.slice(1) : label;
}

/** Options that are all numbers or addresses ("0"–"4", "255.255.255.192", "/26"). */
export function isNumberSet(options: readonly string[]): boolean {
  return options.length > 0 && options.every((o) => /\d/.test(o) && /^[\d\s.,/:%~±+-]+$/.test(o.trim()));
}

/** Options short enough to sit two to a row. */
export function isShortSet(options: readonly string[]): boolean {
  return options.length > 0 && options.every((o) => o.length <= 18);
}

/**
 * The order a pick's options show in. Shuffled once per field, the same on
 * every visit: as written, the answer sits second or third in 94 of the 121
 * picks. Numbers keep their written (rising) order, which gives nothing away.
 */
export function pickOrder(field: SimDropdownField): number[] {
  if (isNumberSet(field.options)) return field.options.map((_, i) => i);
  return shuffleSeeded(field.options.length, seedFromString(`${field.id}:pick`));
}

/** The order a pick-all's options are called in, one at a time. */
export function callOrder(field: SimSelectManyField): number[] {
  return shuffleSeeded(field.options.length, seedFromString(`${field.id}:call`));
}

/** The order a sort's items come up in. */
export function sortOrder(field: SimZonePlacementField): number[] {
  return shuffleSeeded(field.items.length, seedFromString(`${field.id}:sort`));
}

/** The keyboard a phone should open for a typed answer: a number pad for IDs and addresses. */
export function inputModeFor(field: SimTextInputField): "numeric" | "decimal" | "text" {
  const first = field.acceptedValues[0]?.trim() ?? "";
  if (/^\d+$/.test(first)) return "numeric";
  if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(first)) return "decimal";
  return "text";
}

/** What a field is worth to the grader: one point, or one per item to sort. */
export function fieldWeight(field: SimField): number {
  return field.type === "zone-placement" ? field.items.length : 1;
}

/** Credit for one answer, 0 to 1, exactly as the grader gives it. */
export function fieldCredit(field: SimField, answer: SimFieldAnswer | undefined): number {
  return gradeField(field, answer).score;
}

/** The right answer as text, for a pick or a typed field. */
export function answerText(field: SimDropdownField | SimTextInputField): string {
  return field.type === "dropdown" ? field.options[field.correctIndex] : field.acceptedValues[0];
}

/**
 * The devices a topology lab asks to fix: not pre-configured, with settings
 * to set. Each is a stage; the pre-configured ones are read, not played.
 */
export function devicesToFix(scenario: TopologyScenario): TopoDevice[] {
  return scenario.devices.filter((d) => !d.preConfigured && d.fields.length > 0);
}

/** The tasks that have something to answer: each is a stage. */
export function playableStages(tasks: readonly SimTask[]): SimTask[] {
  return tasks.filter((t) => t.fields.length > 0);
}

/** How a stage went (a task, or a device to fix): moves fully right, partly right, and how many in all. */
export function stageTally(task: { fields: readonly SimField[] }, credit: Readonly<Record<string, number>>) {
  let right = 0;
  let partly = 0;
  let points = 0;
  let total = 0;
  for (const f of task.fields) {
    const c = credit[f.id] ?? 0;
    if (c >= 1) right += 1;
    else if (c > 0) partly += 1;
    points += c * fieldWeight(f);
    total += fieldWeight(f);
  }
  return { right, partly, moves: task.fields.length, points, total };
}
