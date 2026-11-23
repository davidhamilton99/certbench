"use client";

import { useCallback, useMemo } from "react";
import type { SimFieldAnswer, SimulationScenario } from "@/data/pbq/types";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import { playableStages, stageTitle } from "@/core/pbq/sim-play";
import type { PbqUpsell } from "@/components/workspace/pbq-upsell";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { CaseFile } from "@/components/workspace/SimCaseFile";
import { StagedLab, type LabStage } from "@/components/workspace/LabKit";
import { domainLabel } from "@/components/path/lab-types";
import { domainName } from "@/lib/seo/objective-meta";

/**
 * A simulation lab, played rather than filled in. Each task is a stage and
 * each of its questions a move, marked the moment it's answered: tiles for a
 * pick, a yes or no on each option of a pick-all, a sort into bins for a
 * placement. The briefing and the stage's evidence sit above as a case file.
 * A stage ends on its score and the explanation, folded; the lab ends on the
 * score the grader gives, partial credit and all, the same as it always was.
 *
 * Replays (Nov 16, 2026) showed why: a visitor did a lab's second task, found
 * "Submit All Answers" greyed out until the first task's dropdowns were
 * filled, went back to a wall of text and left with no score, while the
 * tap-to-order and matching labs on the same page were finished and replayed.
 */
export function SimulationPlayer({
  scenario,
  onBack,
  upsell,
  ...host
}: {
  scenario: SimulationScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const tasks = useMemo(() => playableStages(scenario.tasks), [scenario.tasks]);
  const stages = useMemo<LabStage[]>(
    () => tasks.map((t) => ({ id: t.id, title: stageTitle(t.title), fields: t.fields, explanation: t.explanation })),
    [tasks]
  );

  const grade = useCallback(
    (answers: Record<string, SimFieldAnswer>) => {
      const { result, taskResults } = gradeSimulationScenario(scenario, answers);
      // The grader reports every task in order; the stages are the ones with questions.
      return {
        result,
        stages: tasks.map((t) => {
          const r = taskResults[scenario.tasks.indexOf(t)];
          return { correct: r?.correctFields ?? 0, total: r?.totalFields ?? 0 };
        }),
      };
    },
    [scenario, tasks]
  );

  return (
    <StagedLab
      scenarioId={scenario.id}
      title={scenario.title}
      subtitle={`Domain ${domainLabel(scenario.domain_number)}: ${domainName(scenario.domain_title)}`}
      stages={stages}
      noun="Stage"
      renderCase={({ stage, run }) => (
        <CaseFile key={`${run}-${stage}`} briefing={scenario.briefing} evidence={tasks[stage]?.evidence} />
      )}
      grade={grade}
      explanation={scenario.explanation}
      upsell={upsell}
      onBack={onBack}
      // The result, the way out, word of the first move and the focus on arrival.
      {...host}
    />
  );
}
