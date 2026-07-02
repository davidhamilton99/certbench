"use client";

import { useState, useCallback, useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  SimulationScenario,
  SimTask,
  SimField,
  SimFieldAnswer,
  PbqGradeResult,
  SimTaskGradeResult,
} from "@/data/pbq/types";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import {
  DropdownFieldRenderer,
  TextInputFieldRenderer,
  SelectManyFieldRenderer,
} from "@/components/workspace/PbqFieldRenderers";

/* ------------------------------------------------------------------ */
/*  Simulation-Only Field Renderers                                    */
/* ------------------------------------------------------------------ */

function ZonePlacementFieldRenderer({
  field,
  placements,
  onChange,
}: {
  field: { id: string; label: string; items: string[]; zones: string[] };
  placements: number[];
  onChange: (placements: number[]) => void;
}) {
  const place = (itemIdx: number, zoneIdx: number) => {
    const next = [...placements];
    next[itemIdx] = zoneIdx;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-foreground">
        {field.label}
      </label>
      <div className="flex flex-col gap-1.5">
        {field.items.map((item, itemIdx) => (
          <div
            key={itemIdx}
            className="bg-card border border-border rounded-lg p-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[13px] text-foreground">{item}</span>
              <div className="flex gap-1">
                {field.zones.map((zone, zoneIdx) => {
                  const isSelected = placements[itemIdx] === zoneIdx;
                  return (
                    <button
                      key={zoneIdx}
                      type="button"
                      onClick={() => place(itemIdx, zoneIdx)}
                      className={`
                        px-2.5 py-1 rounded-md text-[12px] font-medium
                        transition-colors duration-150 whitespace-nowrap
                        ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-muted/40 border border-border-light text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }
                      `}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render a single field based on its type. */
function FieldRenderer({
  field,
  answers,
  setAnswer,
}: {
  field: SimField;
  answers: Record<string, SimFieldAnswer>;
  setAnswer: (id: string, answer: SimFieldAnswer) => void;
}) {
  switch (field.type) {
    case "dropdown": {
      const ans = answers[field.id];
      const value = ans?.type === "dropdown" ? ans.selectedIndex : -1;
      return (
        <DropdownFieldRenderer
          field={field}
          value={value}
          onChange={(idx) => setAnswer(field.id, { type: "dropdown", selectedIndex: idx })}
        />
      );
    }
    case "text": {
      const ans = answers[field.id];
      const value = ans?.type === "text" ? ans.value : "";
      return (
        <TextInputFieldRenderer
          field={field}
          value={value}
          onChange={(val) => setAnswer(field.id, { type: "text", value: val })}
        />
      );
    }
    case "select-many": {
      const ans = answers[field.id];
      const selected = ans?.type === "select-many" ? ans.selectedIndices : [];
      return (
        <SelectManyFieldRenderer
          field={field}
          selectedIndices={selected}
          onChange={(indices) => setAnswer(field.id, { type: "select-many", selectedIndices: indices })}
        />
      );
    }
    case "zone-placement": {
      const ans = answers[field.id];
      const placements = ans?.type === "zone-placement" ? ans.placements : new Array(field.items.length).fill(-1);
      return (
        <ZonePlacementFieldRenderer
          field={field}
          placements={placements}
          onChange={(p) => setAnswer(field.id, { type: "zone-placement", placements: p })}
        />
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Task Panel                                                         */
/* ------------------------------------------------------------------ */

function TaskPanel({
  task,
  answers,
  setAnswer,
}: {
  task: SimTask;
  answers: Record<string, SimFieldAnswer>;
  setAnswer: (id: string, answer: SimFieldAnswer) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Instructions */}
      <p className="text-[14px] text-foreground leading-relaxed">
        {task.instructions}
      </p>

      {/* Evidence blocks */}
      {task.evidence?.map((ev, i) => (
        <Panel key={i} padding="sm" className="bg-muted/40 border-l-2 border-l-primary/20">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {ev.label}
          </p>
          <pre className="text-[12px] font-mono text-foreground leading-relaxed overflow-x-auto whitespace-pre">
            {ev.content}
          </pre>
        </Panel>
      ))}

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {task.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            answers={answers}
            setAnswer={setAnswer}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simulation Results                                                 */
/* ------------------------------------------------------------------ */

function SimulationResults({
  scenario,
  result,
  taskResults,
  onRetry,
  onBack,
}: {
  scenario: SimulationScenario;
  result: PbqGradeResult;
  taskResults: SimTaskGradeResult[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const scoreColor =
    result.score >= 75
      ? "text-success"
      : result.score >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="flex flex-col gap-4">
      {/* Overall score */}
      <Panel padding="lg">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[40px] font-mono font-semibold tabular-nums leading-none ${scoreColor}`}
            >
              {result.score}%
            </span>
            <span className="text-[14px] text-muted-foreground">
              {result.correctItems}/{result.totalItems} correct
            </span>
          </div>
          <Badge
            variant={
              result.score >= 75
                ? "success"
                : result.score >= 40
                ? "warning"
                : "danger"
            }
          >
            {result.score >= 75
              ? "Passed"
              : result.score >= 40
              ? "Partial Credit"
              : "Needs Work"}
          </Badge>
        </div>
      </Panel>

      {/* Per-task breakdown */}
      {taskResults.map((tr, i) => {
        const taskPerfect = tr.correctFields === tr.totalFields;
        return (
          <Panel
            key={i}
            padding="md"
            accent={taskPerfect ? "success" : tr.correctFields > 0 ? "warning" : "danger"}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[14px] font-semibold text-foreground">
                {tr.taskTitle}
              </h3>
              <span className="text-[13px] font-mono text-muted-foreground tabular-nums">
                {tr.correctFields}/{tr.totalFields}
              </span>
            </div>
            {tr.feedback.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                {tr.feedback.map((fb, j) => (
                  <p key={j} className="text-[12px] text-muted-foreground">
                    • {fb}
                  </p>
                ))}
              </div>
            )}
          </Panel>
        );
      })}

      {/* Explanation */}
      <Panel padding="md">
        <h3 className="text-[14px] font-semibold text-foreground mb-2">
          Explanation
        </h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {scenario.explanation}
        </p>
      </Panel>

      {/* Per-task explanations */}
      {scenario.tasks.map((task) => (
        <Panel key={task.id} padding="sm">
          <h4 className="text-[13px] font-semibold text-foreground mb-1">
            {task.title}
          </h4>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {task.explanation}
          </p>
        </Panel>
      ))}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onRetry}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Back to Scenarios
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main SimulationPlayer                                              */
/* ------------------------------------------------------------------ */

export function SimulationPlayer({
  scenario,
  onBack,
}: {
  scenario: SimulationScenario;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, SimFieldAnswer>>({});
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [gradeResult, setGradeResult] = useState<{
    result: PbqGradeResult;
    taskResults: SimTaskGradeResult[];
  } | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const setAnswer = useCallback((id: string, answer: SimFieldAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  }, []);

  /** Check if a task has been touched (any field answered). */
  const isTaskTouched = useCallback(
    (task: SimTask) => {
      return task.fields.some((f) => answers[f.id] !== undefined);
    },
    [answers]
  );

  /** Check if all required fields across all tasks are filled. */
  const allFieldsFilled = useMemo(() => {
    for (const task of scenario.tasks) {
      for (const field of task.fields) {
        const ans = answers[field.id];
        if (!ans) return false;
        if (ans.type === "dropdown" && ans.selectedIndex === -1) return false;
        if (ans.type === "text" && ans.value.trim() === "") return false;
        if (ans.type === "zone-placement" && ans.placements.some((p) => p === -1)) return false;
        // select-many: allow empty selection (user might deliberately pick none — grading handles it)
      }
    }
    return true;
  }, [answers, scenario.tasks]);

  const handleSubmit = useCallback(() => {
    const graded = gradeSimulationScenario(scenario, answers);
    setGradeResult(graded);
  }, [scenario, answers]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setActiveTaskIdx(0);
    setGradeResult(null);
  }, []);

  const activeTask = scenario.tasks[activeTaskIdx];
  const progress = ((activeTaskIdx + 1) / scenario.tasks.length) * 100;

  const hasAnyAnswer = Object.keys(answers).length > 0;

  const handleBack = useCallback(() => {
    if (hasAnyAnswer && !gradeResult) {
      setShowBackConfirm(true);
    } else {
      onBack();
    }
  }, [hasAnyAnswer, gradeResult, onBack]);

  return (
    <div className="flex flex-col gap-4">
      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={showBackConfirm}
        title="Leave scenario?"
        message="Your progress will be lost. Are you sure you want to go back?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={onBack}
        onCancel={() => setShowBackConfirm(false)}
      />
      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit all answers?"
        message="Once submitted, your answers will be graded and you cannot change them. Make sure you have reviewed all tasks."
        confirmLabel="Submit"
        cancelLabel="Review"
        onConfirm={() => {
          setShowSubmitConfirm(false);
          handleSubmit();
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="Back to scenarios"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-foreground">
              {scenario.title}
            </h2>
            <Badge variant="neutral">Simulation</Badge>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {/* Results or interactive */}
      {gradeResult ? (
        <SimulationResults
          scenario={scenario}
          result={gradeResult.result}
          taskResults={gradeResult.taskResults}
          onRetry={handleRetry}
          onBack={onBack}
        />
      ) : (
        <>
          {/* Briefing */}
          <Panel padding="md" accent="primary">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Scenario
            </p>
            <p className="text-[14px] text-foreground leading-relaxed">
              {scenario.briefing}
            </p>
          </Panel>

          {/* Task tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
            {scenario.tasks.map((task, idx) => {
              const isActive = idx === activeTaskIdx;
              const touched = isTaskTouched(task);
              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskIdx(idx)}
                  className={`
                    relative px-4 py-2.5 text-[13px] font-medium whitespace-nowrap
                    transition-colors duration-150
                    ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    {task.title}
                    {touched && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active task */}
          <TaskPanel
            task={activeTask}
            answers={answers}
            setAnswer={setAnswer}
          />

          {/* Progress + Submit */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                Task {activeTaskIdx + 1} of {scenario.tasks.length}
              </span>
              <div className="flex gap-2">
                {activeTaskIdx > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTaskIdx(activeTaskIdx - 1)}
                  >
                    Previous
                  </Button>
                )}
                {activeTaskIdx < scenario.tasks.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTaskIdx(activeTaskIdx + 1)}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
            <ProgressBar value={progress} size="sm" />
            <Button
             
              onClick={() => setShowSubmitConfirm(true)}
              disabled={!allFieldsFilled}
            >
              Submit All Answers
            </Button>
            {!allFieldsFilled && (
              <p className="text-[12px] text-muted-foreground text-center">
                Complete all fields across all tasks before submitting.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}