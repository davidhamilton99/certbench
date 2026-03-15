/**
 * Grading logic for multi-step PBQ simulations.
 * Each field across all tasks is worth equal weight.
 */

import type {
  SimulationScenario,
  SimFieldAnswer,
  PbqGradeResult,
  SimTaskGradeResult,
} from "@/data/pbq/types";
import { gradeField } from "@/lib/pbq/grade-field";

/** Grade a full simulation scenario. */
export function gradeSimulationScenario(
  scenario: SimulationScenario,
  answers: Record<string, SimFieldAnswer>
): { result: PbqGradeResult; taskResults: SimTaskGradeResult[] } {
  const taskResults: SimTaskGradeResult[] = [];
  let totalScore = 0;
  let totalFields = 0;
  const allFeedback: string[] = [];

  for (const task of scenario.tasks) {
    let taskCorrect = 0;
    let taskTotal = 0;
    const taskFeedback: string[] = [];

    for (const field of task.fields) {
      const weight = field.type === "zone-placement" ? field.items.length : 1;
      taskTotal += weight;
      totalFields += weight;

      const { score, feedback } = gradeField(field, answers[field.id]);
      const fieldScore = score * weight;
      taskCorrect += fieldScore;
      totalScore += fieldScore;

      if (feedback) {
        taskFeedback.push(feedback);
        allFeedback.push(feedback);
      }
    }

    taskResults.push({
      taskTitle: task.title,
      totalFields: taskTotal,
      correctFields: Math.round(taskCorrect),
      feedback: taskFeedback,
    });
  }

  const finalScore =
    totalFields > 0 ? Math.round((totalScore / totalFields) * 100) : 0;

  return {
    result: {
      score: finalScore,
      totalItems: totalFields,
      correctItems: Math.round(totalScore),
      feedback: allFeedback,
    },
    taskResults,
  };
}
