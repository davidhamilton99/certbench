/**
 * PBQ grading with partial credit.
 * Each correct item/pair earns equal weight toward 100%.
 */

import type {
  PbqScenario,
  PbqGradeResult,
  OrderingScenario,
  MatchingScenario,
  CategorizationScenario,
} from "@/data/pbq/types";

export function gradeScenario(
  scenario: PbqScenario,
  userAnswer: number[]
): PbqGradeResult {
  switch (scenario.type) {
    case "ordering":
      return gradeOrdering(scenario, userAnswer);
    case "matching":
      return gradeMatching(scenario, userAnswer);
    case "categorization":
      return gradeCategorization(scenario, userAnswer);
  }
}

function gradeOrdering(
  scenario: OrderingScenario,
  userOrder: number[]
): PbqGradeResult {
  const total = scenario.correct_order.length;
  let correct = 0;
  const feedback: string[] = [];

  for (let i = 0; i < total; i++) {
    if (userOrder[i] === scenario.correct_order[i]) {
      correct++;
    } else {
      const expected = scenario.items[scenario.correct_order[i]];
      const got = scenario.items[userOrder[i]];
      feedback.push(`Position ${i + 1}: expected "${expected}", got "${got}"`);
    }
  }

  return {
    score: Math.round((correct / total) * 100),
    totalItems: total,
    correctItems: correct,
    feedback,
  };
}

function gradeMatching(
  scenario: MatchingScenario,
  userMap: number[]
): PbqGradeResult {
  const total = scenario.correct_map.length;
  let correct = 0;
  const feedback: string[] = [];

  for (let i = 0; i < total; i++) {
    if (userMap[i] === scenario.correct_map[i]) {
      correct++;
    } else {
      const leftItem = scenario.left[i];
      const expected = scenario.right[scenario.correct_map[i]];
      const got =
        userMap[i] !== undefined && userMap[i] !== -1
          ? scenario.right[userMap[i]]
          : "(not matched)";
      feedback.push(`"${leftItem}" → expected "${expected}", got "${got}"`);
    }
  }

  return {
    score: Math.round((correct / total) * 100),
    totalItems: total,
    correctItems: correct,
    feedback,
  };
}

function gradeCategorization(
  scenario: CategorizationScenario,
  userCategories: number[]
): PbqGradeResult {
  const total = scenario.items.length;
  let correct = 0;
  const feedback: string[] = [];

  for (let i = 0; i < total; i++) {
    if (userCategories[i] === scenario.items[i].category) {
      correct++;
    } else {
      const item = scenario.items[i].text;
      const expected = scenario.categories[scenario.items[i].category];
      const got =
        userCategories[i] !== undefined && userCategories[i] !== -1
          ? scenario.categories[userCategories[i]]
          : "(not placed)";
      feedback.push(`"${item}" → expected "${expected}", got "${got}"`);
    }
  }

  return {
    score: Math.round((correct / total) * 100),
    totalItems: total,
    correctItems: correct,
    feedback,
  };
}
