/**
 * Threat Hunt grading.
 *
 * Two components:
 *   1. Flagging accuracy — balanced so neither "flag everything" nor "flag
 *      nothing" can score well. We average recall (malicious lines caught)
 *      and specificity (benign lines correctly left alone), each 0–1, so a
 *      blanket strategy lands at 50% and only genuine discrimination climbs.
 *   2. Attack identification — the payoff question.
 *
 * Overall score weights flagging 70% and identification 30%.
 */

import type {
  PbqGradeResult,
  ThreatHuntScenario,
  ThreatHuntAnswer,
} from "@/data/pbq/types";

const FLAG_WEIGHT = 0.7;
const ID_WEIGHT = 0.3;

export function gradeThreatHunt(
  scenario: ThreatHuntScenario,
  answer: ThreatHuntAnswer
): PbqGradeResult {
  const flagged = new Set(answer.flagged);
  const feedback: string[] = [];

  let maliciousTotal = 0;
  let maliciousCaught = 0;
  let benignTotal = 0;
  let benignLeftAlone = 0;
  let lineCorrect = 0;

  scenario.lines.forEach((line, i) => {
    const isFlagged = flagged.has(i);
    if (line.malicious) {
      maliciousTotal++;
      if (isFlagged) {
        maliciousCaught++;
        lineCorrect++;
      } else {
        feedback.push(`Missed evidence: ${line.text}`);
      }
    } else {
      benignTotal++;
      if (!isFlagged) {
        benignLeftAlone++;
        lineCorrect++;
      } else {
        feedback.push(`False alarm — this line is benign: ${line.text}`);
      }
    }
  });

  // Balanced flagging score (each side 0–1; blanket strategies → 0.5).
  const recall = maliciousTotal === 0 ? 1 : maliciousCaught / maliciousTotal;
  const specificity = benignTotal === 0 ? 1 : benignLeftAlone / benignTotal;
  const flagScore = (recall + specificity) / 2;

  const idCorrect = answer.attackChoice === scenario.correctOption;
  if (!idCorrect) {
    const chosen =
      answer.attackChoice >= 0
        ? scenario.options[answer.attackChoice]
        : "(no attack selected)";
    feedback.push(
      `Attack identification: you chose "${chosen}" — the evidence points to "${scenario.options[scenario.correctOption]}".`
    );
  }

  const score = Math.round(
    (flagScore * FLAG_WEIGHT + (idCorrect ? 1 : 0) * ID_WEIGHT) * 100
  );

  // totalItems counts every line plus the identification, so the "X / Y"
  // headline stays meaningful alongside the weighted percentage.
  return {
    score,
    totalItems: scenario.lines.length + 1,
    correctItems: lineCorrect + (idCorrect ? 1 : 0),
    feedback,
  };
}
