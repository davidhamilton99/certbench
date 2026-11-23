"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  clearSetProgress,
  saveSetProgress,
  type StudyQuestion,
} from "@/contracts/study-sets";
import { userMessage } from "@/lib/errors/user-message";
import { gradeStudyAnswer } from "@/core/study-materials/grade";
import type { MCTFOption } from "@/core/study-materials/types";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { StudyQuestionRenderer } from "./StudyQuestionRenderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase =
  | { name: "question"; selection: ResponseValue | undefined }
  | { name: "revealed"; selection: ResponseValue; wasCorrect: boolean }
  | { name: "complete" };

/** The one correct answer's words, for a question that has exactly one. */
function singleAnswer(question: StudyQuestion): string | null {
  if (question.question_type !== "multiple_choice" && question.question_type !== "true_false") return null;
  return (question.options as MCTFOption[]).find((o) => o.is_correct)?.text ?? null;
}

/**
 * Immediate-feedback player for study sets (own + community). Grades
 * client-side with the shared core grader; progress persists via
 * study_set_progress for cross-device resume (persistProgress=false for
 * community/share contexts).
 *
 * After "Check answer" the card waits for "Continue", which takes the focus. A
 * question that follows another takes the focus as it arrives, so it is read.
 */
export function StudySetPlayer({
  setId,
  questions,
  seed,
  initialIndex = 0,
  initialCorrect = 0,
  persistProgress = true,
  backHref = "/study-materials",
  backLabel = "Return to your study sets",
}: {
  setId: string;
  questions: StudyQuestion[];
  /** Shuffle seed. Generated server-side so SSR and hydration agree. */
  seed: string;
  initialIndex?: number;
  initialCorrect?: number;
  persistProgress?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const total = questions.length;
  const startIndex = Math.min(initialIndex, total - 1);
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
  const promptId = useId();
  const verdictId = useId();
  // Nothing takes the focus as the page loads; each later view does.
  const moved = useRef(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!moved.current) return;
    if (phase.name === "revealed") nextRef.current?.focus();
    else if (phase.name === "complete") resultRef.current?.focus();
    else promptRef.current?.focus();
  }, [phase.name, index]);

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

  /** Ordering starts pre-arranged: the displayed order IS a valid answer. */
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
    moved.current = true;
    setCorrect(nextCorrect);
    setPhase({ name: "revealed", selection, wasCorrect });
    persist(index + 1, nextCorrect);
  }

  function next() {
    moved.current = true;
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
      moved.current = true;
      setIndex(0);
      setCorrect(0);
      setPhase({ name: "question", selection: undefined });
    } catch (err) {
      toast.error(userMessage(err, "The study set could not be started again. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (total === 0) {
    return (
      <p className="mx-auto w-full max-w-2xl rounded-lg border border-dashed p-8 text-small text-muted-foreground">
        This study set has no questions.
      </p>
    );
  }

  if (phase.name === "complete") {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="glass mx-auto grid w-full max-w-2xl gap-4 rounded-lg p-5 sm:p-8">
        <h2 ref={resultRef} tabIndex={-1} className="cb-statement">
          You answered {correct} of {total} {total === 1 ? "question" : "questions"} correctly ({pct}%).
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={restart} loading={saving}>
            Start again
          </Button>
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const revealed = phase.name === "revealed";
  const rightAnswer = singleAnswer(question);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-small">
        <span className="font-medium">
          Question {index + 1} of {total}
        </span>
        <span className="text-note text-muted-foreground">{correct} correct so far</span>
      </div>

      <div className="glass grid gap-5 rounded-lg p-5 sm:p-8">
        <h2
          id={promptId}
          // Takes the focus so that it is read; it is not a control.
          ref={promptRef}
          tabIndex={-1}
          className="text-pretty text-body font-medium"
        >
          {question.question_text}
        </h2>
        <StudyQuestionRenderer
          question={question}
          seed={seed}
          value={phase.selection}
          onChange={(value) => phase.name === "question" && setPhase({ name: "question", selection: value })}
          revealed={revealed}
          labelledBy={promptId}
        />
        {revealed && (
          <p id={verdictId} className="cb-measure border-t border-border pt-4 text-small">
            <span className={cn("font-semibold", phase.wasCorrect ? "text-success" : "text-destructive")}>
              {phase.wasCorrect
                ? "Correct."
                : rightAnswer
                  ? `Incorrect. The correct answer is ${rightAnswer}.`
                  : "Incorrect."}
            </span>
            {question.explanation && <> {question.explanation}</>}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        {revealed ? (
          <Button ref={nextRef} onClick={next} aria-describedby={verdictId} className="h-11 w-full sm:h-10 sm:w-auto">
            Continue
          </Button>
        ) : (
          <Button onClick={check} disabled={!effectiveSelection()} className="h-11 w-full sm:h-10 sm:w-auto">
            Check answer
          </Button>
        )}
      </div>
    </div>
  );
}
