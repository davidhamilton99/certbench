"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  clearSetProgress,
  explainStudyQuestion,
  saveSetProgress,
  type StudyQuestion,
} from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { gradeStudyAnswer } from "@/core/study-materials/grade";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { StudyQuestionRenderer } from "./StudyQuestionRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Phase =
  | { name: "question"; selection: ResponseValue | undefined }
  | { name: "revealed"; selection: ResponseValue; wasCorrect: boolean }
  | { name: "complete" };

/**
 * Immediate-feedback player for study sets (own + community). Grades
 * client-side with the shared core grader; progress persists via
 * study_set_progress for cross-device resume (persistProgress=false for
 * community/share contexts).
 */
export function StudySetPlayer({
  setId,
  questions,
  initialIndex = 0,
  initialCorrect = 0,
  persistProgress = true,
  backHref = "/study-materials",
  backLabel = "Back to study sets",
}: {
  setId: string;
  questions: StudyQuestion[];
  initialIndex?: number;
  initialCorrect?: number;
  persistProgress?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const total = questions.length;
  const startIndex = Math.min(initialIndex, total - 1);
  const [seed] = useState(() => crypto.randomUUID());
  const [index, setIndex] = useState(
    initialIndex >= total ? 0 : startIndex
  );
  const [correct, setCorrect] = useState(
    initialIndex >= total ? 0 : initialCorrect
  );
  const [phase, setPhase] = useState<Phase>({
    name: "question",
    selection: undefined,
  });
  const [saving, setSaving] = useState(false);

  const question = questions[index];

  function persist(nextIndex: number, nextCorrect: number) {
    if (!persistProgress) return;
    void api(saveSetProgress, {
      setId,
      currentIndex: nextIndex,
      correctCount: nextCorrect,
      totalQuestions: total,
    }).catch(() => {});
  }

  /** Ordering starts pre-arranged — the displayed order IS a valid answer. */
  function effectiveSelection(): ResponseValue | undefined {
    if (phase.name !== "question") return undefined;
    if (phase.selection) return phase.selection;
    if (question.question_type === "ordering") {
      return {
        kind: "ordering",
        order: seededPermutation(seed, question.id, question.options.length),
      };
    }
    return undefined;
  }

  function check() {
    if (phase.name !== "question") return;
    const selection = effectiveSelection();
    if (!selection) return;
    const wasCorrect = gradeStudyAnswer(question, selection);
    const nextCorrect = correct + (wasCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    setPhase({ name: "revealed", selection, wasCorrect });
    persist(index + 1, nextCorrect);
  }

  function next() {
    if (index + 1 >= total) {
      setPhase({ name: "complete" });
    } else {
      setIndex(index + 1);
      setPhase({ name: "question", selection: undefined });
    }
  }

  async function restart() {
    setSaving(true);
    try {
      if (persistProgress) await api(clearSetProgress, { setId });
      setIndex(0);
      setCorrect(0);
      setPhase({ name: "question", selection: undefined });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        This set has no questions yet.
      </p>
    );
  }

  if (phase.name === "complete") {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="mx-auto grid max-w-md gap-4 py-12 text-center">
        <p className="text-3xl font-semibold">
          {correct}/{total}{" "}
          <span
            className={cn(
              "text-lg",
              pct >= 75 ? "text-success" : pct >= 40 ? "text-warning" : "text-danger"
            )}
          >
            {pct}%
          </span>
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={restart} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Start over
          </Button>
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const revealed = phase.name === "revealed";

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono">
          {index + 1} / {total}
        </span>
        <span className="text-muted-foreground">{correct} correct so far</span>
      </div>

      <Card>
        <CardContent className="grid gap-5">
          <p className="leading-relaxed">{question.question_text}</p>
          <StudyQuestionRenderer
            question={question}
            seed={seed}
            value={phase.name === "question" ? phase.selection : phase.selection}
            onChange={(value) =>
              phase.name === "question" &&
              setPhase({ name: "question", selection: value })
            }
            revealed={revealed}
          />
          {revealed && (
            <div className="grid gap-2 border-t pt-4 text-sm">
              <p
                className={cn(
                  "font-medium",
                  phase.wasCorrect ? "text-success" : "text-danger"
                )}
              >
                {phase.wasCorrect ? "Correct" : "Not quite"}
              </p>
              {question.explanation ? (
                <p className="text-muted-foreground">{question.explanation}</p>
              ) : (
                persistProgress && <ExplainOnDemand questionId={question.id} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {revealed ? (
          <Button onClick={next}>
            {index + 1 >= total ? "See results" : "Next question"}
          </Button>
        ) : (
          <Button onClick={check} disabled={!effectiveSelection()}>
            Check answer
          </Button>
        )}
      </div>
    </div>
  );
}

/** Fetches an AI explanation on demand (cached server-side after first ask). */
function ExplainOnDemand({ questionId }: { questionId: string }) {
  const [state, setState] = useState<
    { s: "idle" } | { s: "loading" } | { s: "done"; text: string }
  >({ s: "idle" });

  if (state.s === "done") {
    return <p className="text-muted-foreground">{state.text}</p>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-self-start text-muted-foreground"
      disabled={state.s === "loading"}
      onClick={async () => {
        setState({ s: "loading" });
        try {
          const { explanation } = await api(explainStudyQuestion, {
            questionId,
            selectedAnswer: "",
          });
          setState({ s: "done", text: explanation });
        } catch (err) {
          toast.error(
            err instanceof ApiError ? err.message : "Could not generate an explanation"
          );
          setState({ s: "idle" });
        }
      }}
    >
      {state.s === "loading" && <Loader2 className="animate-spin" />}
      Explain this answer
    </Button>
  );
}
