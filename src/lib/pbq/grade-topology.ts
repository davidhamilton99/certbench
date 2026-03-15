/**
 * Grading logic for topology PBQ scenarios.
 * Two dimensions: field correctness + pre-configured device penalty.
 */

import type {
  TopologyScenario,
  TopoFieldAnswer,
  TopoField,
  PbqGradeResult,
  TopoDeviceGradeResult,
  SimFieldAnswer,
  SimField,
} from "@/data/pbq/types";
import { gradeField } from "@/lib/pbq/grade-field";

/* ------------------------------------------------------------------ */
/*  Unified field grading dispatch                                     */
/* ------------------------------------------------------------------ */

function gradeTopoField(
  field: TopoField,
  answer: TopoFieldAnswer | undefined
): { score: number; feedback: string | null } {
  return gradeField(
    field as SimField,
    answer as SimFieldAnswer | undefined
  );
}

/* ------------------------------------------------------------------ */
/*  Main topology grading                                              */
/* ------------------------------------------------------------------ */

export function gradeTopologyScenario(
  scenario: TopologyScenario,
  answers: Record<string, TopoFieldAnswer>
): { result: PbqGradeResult; deviceResults: TopoDeviceGradeResult[] } {
  const deviceResults: TopoDeviceGradeResult[] = [];
  let totalScore = 0;
  let totalFields = 0;
  const allFeedback: string[] = [];

  for (const device of scenario.devices) {
    // Skip devices with no fields (e.g., cloud, labels-only)
    if (device.fields.length === 0) continue;

    const devFeedback: string[] = [];

    if (device.preConfigured) {
      // Pre-configured device: check if user touched any field
      const touched = device.fields.some((f) => answers[f.id] !== undefined);
      const fieldCount = device.fields.length;
      totalFields += fieldCount;

      if (touched) {
        // Penalty: each touched field counts as incorrect
        const touchedCount = device.fields.filter(
          (f) => answers[f.id] !== undefined
        ).length;
        // Un-touched fields on a pre-configured device are "correct" (left alone)
        const correctCount = fieldCount - touchedCount;
        totalScore += correctCount;
        devFeedback.push(
          `${device.label} was already correctly configured — you should not have modified it`
        );
        allFeedback.push(
          `${device.label}: already correctly configured, should not have been modified`
        );

        deviceResults.push({
          deviceLabel: device.label,
          deviceId: device.id,
          preConfigured: true,
          totalFields: fieldCount,
          correctFields: correctCount,
          feedback: devFeedback,
        });
      } else {
        // Correctly left alone — full marks
        totalScore += fieldCount;
        deviceResults.push({
          deviceLabel: device.label,
          deviceId: device.id,
          preConfigured: true,
          totalFields: fieldCount,
          correctFields: fieldCount,
          feedback: ["Correctly left unchanged"],
        });
      }
    } else {
      // Non-pre-configured device: grade each field normally
      let devCorrect = 0;
      let devTotal = 0;

      for (const field of device.fields) {
        const weight = 1;
        devTotal += weight;
        totalFields += weight;

        const { score, feedback } = gradeTopoField(field, answers[field.id]);
        const fieldScore = score * weight;
        devCorrect += fieldScore;
        totalScore += fieldScore;

        if (feedback) {
          devFeedback.push(feedback);
          allFeedback.push(feedback);
        }
      }

      deviceResults.push({
        deviceLabel: device.label,
        deviceId: device.id,
        preConfigured: false,
        totalFields: devTotal,
        correctFields: Math.round(devCorrect),
        feedback: devFeedback,
      });
    }
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
    deviceResults,
  };
}
