/**
 * Grading logic for topology PBQ scenarios.
 * Two dimensions: field correctness + pre-configured device penalty.
 */

import type {
  TopologyScenario,
  TopoFieldAnswer,
  TopoField,
  TopoCLIField,
  PbqGradeResult,
  TopoDeviceGradeResult,
  SimFieldAnswer,
  SimField,
} from "@/data/pbq/types";

/* ------------------------------------------------------------------ */
/*  Normalisation                                                      */
/* ------------------------------------------------------------------ */

/** Normalise a CLI command for comparison: trim, collapse whitespace, lowercase. */
function normCmd(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Normalise text for comparison. */
function normalise(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Field grading (reuses sim logic for dropdown/text/select-many)     */
/* ------------------------------------------------------------------ */

function gradeSimField(
  field: SimField,
  answer: SimFieldAnswer | undefined
): { score: number; feedback: string | null } {
  if (!answer) {
    return { score: 0, feedback: `"${field.label}": not answered` };
  }

  switch (field.type) {
    case "dropdown": {
      if (answer.type !== "dropdown")
        return { score: 0, feedback: `"${field.label}": invalid answer type` };
      if (answer.selectedIndex === field.correctIndex) {
        return { score: 1, feedback: null };
      }
      const expected = field.options[field.correctIndex];
      const got = field.options[answer.selectedIndex] ?? "(none)";
      return {
        score: 0,
        feedback: `${field.label}: expected "${expected}", got "${got}"`,
      };
    }

    case "text": {
      if (answer.type !== "text")
        return { score: 0, feedback: `"${field.label}": invalid answer type` };
      const userVal = normalise(answer.value);
      const match = field.acceptedValues.some((v) => normalise(v) === userVal);
      if (match) return { score: 1, feedback: null };
      return {
        score: 0,
        feedback: `${field.label}: expected "${field.acceptedValues[0]}", got "${answer.value.trim()}"`,
      };
    }

    case "select-many": {
      if (answer.type !== "select-many")
        return { score: 0, feedback: `"${field.label}": invalid answer type` };
      const correctSet = new Set(field.correctIndices);
      const userSet = new Set(answer.selectedIndices);
      let correctPicks = 0;
      let incorrectPicks = 0;
      for (const idx of userSet) {
        if (correctSet.has(idx)) correctPicks++;
        else incorrectPicks++;
      }
      const missed = correctSet.size - correctPicks;
      const raw = Math.max(0, correctPicks - incorrectPicks) / correctSet.size;
      if (raw >= 1) return { score: 1, feedback: null };
      const parts: string[] = [];
      if (incorrectPicks > 0) parts.push(`${incorrectPicks} incorrect`);
      if (missed > 0) parts.push(`${missed} missed`);
      return { score: raw, feedback: `${field.label}: ${parts.join(", ")}` };
    }

    case "zone-placement": {
      if (answer.type !== "zone-placement")
        return { score: 0, feedback: `"${field.label}": invalid answer type` };
      let correct = 0;
      const fb: string[] = [];
      for (let i = 0; i < field.items.length; i++) {
        if (answer.placements[i] === field.correctZones[i]) {
          correct++;
        } else {
          const expected = field.zones[field.correctZones[i]];
          const got =
            answer.placements[i] >= 0
              ? field.zones[answer.placements[i]]
              : "(not placed)";
          fb.push(`"${field.items[i]}": expected "${expected}", got "${got}"`);
        }
      }
      if (correct === field.items.length)
        return { score: 1, feedback: null };
      return {
        score: correct / field.items.length,
        feedback: `${field.label}: ${fb.join("; ")}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  CLI field grading                                                  */
/* ------------------------------------------------------------------ */

/**
 * Check if user commands contain an accepted sequence as an ordered
 * subsequence. Allows extra commands between required ones.
 */
function matchesSequence(
  userCommands: string[],
  acceptedSeq: string[]
): boolean {
  const normUser = userCommands.map(normCmd).filter((c) => c.length > 0);
  const normAccepted = acceptedSeq.map(normCmd);

  let seqIdx = 0;
  for (const cmd of normUser) {
    if (seqIdx < normAccepted.length && cmd === normAccepted[seqIdx]) {
      seqIdx++;
    }
  }
  return seqIdx === normAccepted.length;
}

function gradeCLIField(
  field: TopoCLIField,
  answer: TopoFieldAnswer | undefined
): { score: number; feedback: string | null } {
  if (!answer || answer.type !== "cli") {
    return { score: 0, feedback: `"${field.label}": no commands entered` };
  }

  if (answer.commands.length === 0) {
    return { score: 0, feedback: `"${field.label}": no commands entered` };
  }

  // Check against each accepted sequence
  for (const seq of field.acceptedSequences) {
    if (matchesSequence(answer.commands, seq)) {
      return { score: 1, feedback: null };
    }
  }

  return {
    score: 0,
    feedback: `${field.label}: commands did not match expected configuration${field.hint ? ` (Hint: ${field.hint})` : ""}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Unified field grading dispatch                                     */
/* ------------------------------------------------------------------ */

function gradeTopoField(
  field: TopoField,
  answer: TopoFieldAnswer | undefined
): { score: number; feedback: string | null } {
  if (field.type === "cli") {
    return gradeCLIField(field, answer);
  }
  // For non-CLI fields, delegate to sim field grading
  return gradeSimField(
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
