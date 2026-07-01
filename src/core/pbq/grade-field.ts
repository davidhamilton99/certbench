/**
 * Shared field grading logic used by both simulation and topology graders.
 */

import type { SimField, SimFieldAnswer } from "@/data/pbq/types";

/** Normalise text for comparison: trim, collapse whitespace, lowercase. */
function normalise(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Grade a single field. Returns 0 or 1 (or fractional for select-many/zone-placement). */
export function gradeField(
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
          fb.push(
            `"${field.items[i]}": expected "${expected}", got "${got}"`
          );
        }
      }
      if (correct === field.items.length) return { score: 1, feedback: null };
      return {
        score: correct / field.items.length,
        feedback: `${field.label}: ${fb.join("; ")}`,
      };
    }
  }
}
