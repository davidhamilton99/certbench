/**
 * Grading for terminal PBQ scenarios. Each finding is worth equal weight.
 * Answers are matched case- and whitespace-insensitively; a finding may also
 * accept any path whose basename matches (so "/tmp/.sysupdate", ".sysupdate"
 * and "sysupdate" all pass for the same file).
 */

import type {
  TerminalScenario,
  TerminalAnswer,
  TerminalGradeResult,
  TerminalFindingResult,
} from "@/data/pbq/types";

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

function basename(s: string): string {
  return norm(s).replace(/\/+$/, "").split("/").pop() || "";
}

export function gradeTerminal(
  scenario: TerminalScenario,
  answer: TerminalAnswer
): TerminalGradeResult {
  const findings: TerminalFindingResult[] = scenario.findings.map((f) => {
    const given = (answer.values[f.id] || "").trim();
    const g = norm(given);
    const accepts = f.accept.map(norm);
    let correct = g !== "" && accepts.includes(g);
    if (!correct && f.acceptBasename && g !== "") {
      const b = basename(given);
      correct = b !== "" && (accepts.includes(b) || accepts.some((a) => basename(a) === b));
    }
    return { id: f.id, label: f.label, given, correct };
  });

  const correct = findings.filter((f) => f.correct).length;
  const total = findings.length;
  return {
    score: total ? Math.round((correct / total) * 100) : 0,
    total,
    correct,
    findings,
  };
}
