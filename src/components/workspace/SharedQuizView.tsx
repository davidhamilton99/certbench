"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

interface MCTFOption {
  text: string;
  is_correct: boolean;
}
interface OrderingOption {
  text: string;
  correct_position: number;
}
interface MatchingOption {
  left: string;
  right: string;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi-Select",
  ordering: "Ordering",
  matching: "Matching",
};

interface StudySet {
  id: string;
  title: string;
  category: string | null;
  question_count: number;
  is_public: boolean;
  created_at: string;
}

interface StudyQuestion {
  id: string;
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

type Phase = "overview" | "practicing" | "revealed" | "complete";

export function SharedQuizView({
  studySet,
  questions,
  creatorName,
}: {
  studySet: StudySet;
  questions: StudyQuestion[];
  creatorName: string;
}) {
  const [phase, setPhase] = useState<Phase>("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // MC answer state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionOrder, setOptionOrder] = useState<number[]>([0, 1, 2, 3]);

  // Multi-select state
  const [msSelected, setMsSelected] = useState<Set<number>>(new Set());

  // Ordering state
  const [orderingSequence, setOrderingSequence] = useState<number[]>([]);

  // Matching state
  const [matchingRightOrder, setMatchingRightOrder] = useState<number[]>([]);
  const [matchingLeft, setMatchingLeft] = useState<number | null>(null);
  const [matchingPairs, setMatchingPairs] = useState<Map<number, number>>(
    new Map()
  );

  const currentQuestion = questions[currentIndex];
  const currentType: QuestionType =
    currentQuestion?.question_type || "multiple_choice";
  const progress =
    questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  const shuffledOptions = useMemo(() => {
    if (!currentQuestion || currentType !== "multiple_choice") return [];
    return optionOrder.map(
      (origIdx) => (currentQuestion.options as MCTFOption[])[origIdx]
    );
  }, [currentQuestion, currentType, optionOrder]);

  const shuffledCorrectIndex = useMemo(() => {
    if (!currentQuestion || currentType !== "multiple_choice") return 0;
    return optionOrder.indexOf(currentQuestion.correct_index);
  }, [currentQuestion, currentType, optionOrder]);

  const isAnswerReady = useMemo(() => {
    if (!currentQuestion) return false;
    switch (currentType) {
      case "multiple_choice":
      case "true_false":
        return selectedOption !== null;
      case "multiple_select":
        return msSelected.size > 0;
      case "ordering":
        return orderingSequence.length === currentQuestion.options.length;
      case "matching":
        return matchingPairs.size === currentQuestion.options.length;
      default:
        return false;
    }
  }, [
    currentQuestion,
    currentType,
    selectedOption,
    msSelected,
    orderingSequence,
    matchingPairs,
  ]);

  const resetAnswerState = useCallback(() => {
    setSelectedOption(null);
    setMsSelected(new Set());
    setOrderingSequence([]);
    setMatchingLeft(null);
    setMatchingPairs(new Map());
  }, []);

  const initQuestionState = useCallback((q: StudyQuestion) => {
    const type = q.question_type || "multiple_choice";
    if (type === "multiple_choice") {
      setOptionOrder(shuffleIndices(q.options.length));
    } else if (type === "matching") {
      setMatchingRightOrder(shuffleIndices(q.options.length));
    }
  }, []);

  const startPractice = useCallback(() => {
    setCurrentIndex(0);
    setCorrectCount(0);
    resetAnswerState();
    if (questions.length > 0) {
      initQuestionState(questions[0]);
    }
    setPhase("practicing");
  }, [questions, resetAnswerState, initQuestionState]);

  const checkAnswer = useCallback(() => {
    if (!currentQuestion) return;
    let isCorrect = false;

    switch (currentType) {
      case "multiple_choice":
        isCorrect = selectedOption === shuffledCorrectIndex;
        break;
      case "true_false":
        isCorrect = selectedOption === currentQuestion.correct_index;
        break;
      case "multiple_select": {
        const opts = currentQuestion.options as MCTFOption[];
        const correctSet = new Set(
          opts
            .map((o, i) => (o.is_correct ? i : -1))
            .filter((i) => i !== -1)
        );
        isCorrect =
          msSelected.size === correctSet.size &&
          [...msSelected].every((i) => correctSet.has(i));
        break;
      }
      case "ordering": {
        const opts = currentQuestion.options as OrderingOption[];
        isCorrect = orderingSequence.every(
          (origIdx, pos) => opts[origIdx].correct_position === pos
        );
        break;
      }
      case "matching": {
        isCorrect =
          matchingPairs.size === currentQuestion.options.length &&
          [...matchingPairs.entries()].every(([l, r]) => l === r);
        break;
      }
    }

    if (isCorrect) setCorrectCount((c) => c + 1);
    setPhase("revealed");
  }, [
    currentQuestion,
    currentType,
    selectedOption,
    shuffledCorrectIndex,
    msSelected,
    orderingSequence,
    matchingPairs,
  ]);

  const nextQuestion = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setPhase("complete");
      return;
    }
    setCurrentIndex(next);
    resetAnswerState();
    initQuestionState(questions[next]);
    setPhase("practicing");
  }, [currentIndex, questions, resetAnswerState, initQuestionState]);

  // =======================================================================
  // RENDER: Complete
  // =======================================================================
  if (phase === "complete") {
    const pct =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

    return (
      <div className="min-h-screen bg-bg-page">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card padding="lg">
            <div className="flex flex-col items-center gap-4 py-8">
              <h1 className="text-[24px] font-semibold text-text-primary">
                Quiz Complete
              </h1>
              <p className="text-[48px] font-mono font-bold text-primary tabular-nums">
                {pct}%
              </p>
              <p className="text-[15px] text-text-secondary">
                {correctCount} of {questions.length} correct
              </p>
              <div className="flex gap-3 mt-4">
                <Button onClick={startPractice}>Try Again</Button>
                <Link href="/login">
                  <Button variant="secondary">
                    Sign up to save progress
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
          <p className="text-center text-[13px] text-text-muted mt-6">
            Shared from{" "}
            <Link href="/" className="text-primary hover:underline">
              CertBench
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // =======================================================================
  // RENDER: Practice + Revealed
  // =======================================================================
  if (
    (phase === "practicing" || phase === "revealed") &&
    currentQuestion
  ) {
    const typeLabel =
      currentType !== "multiple_choice" ? TYPE_LABELS[currentType] : null;

    return (
      <div className="min-h-screen bg-bg-page">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-mono text-text-muted">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-[13px] font-mono text-text-muted">
              {studySet.title}
            </span>
          </div>
          <ProgressBar value={progress} />

          <Card padding="lg" className="mt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2">
                <p className="text-[16px] font-medium text-text-primary flex-1">
                  {currentQuestion.question_text}
                </p>
                {typeLabel && (
                  <Badge variant="neutral">{typeLabel}</Badge>
                )}
              </div>

              {/* MC options */}
              {currentType === "multiple_choice" && (
                <div className="flex flex-col gap-2">
                  {shuffledOptions.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = selectedOption === i;
                    const isRevealed = phase === "revealed";
                    const isCorrect = i === shuffledCorrectIndex;

                    let style =
                      "border-border bg-bg-surface hover:border-border-dark";
                    if (isRevealed && isCorrect)
                      style = "border-success bg-success-bg";
                    else if (isRevealed && isSelected && !isCorrect)
                      style = "border-danger bg-danger-bg";
                    else if (isSelected)
                      style = "border-primary bg-info-bg";

                    return (
                      <button
                        key={i}
                        onClick={() =>
                          !isRevealed && setSelectedOption(i)
                        }
                        disabled={isRevealed}
                        className={`flex items-center gap-3 px-4 py-3 border rounded-md text-left transition-colors ${style}`}
                      >
                        <span className="text-[13px] font-mono text-text-muted w-5 shrink-0">
                          {letter}
                        </span>
                        <span className="text-[14px] text-text-primary">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* T/F options */}
              {currentType === "true_false" && (
                <div className="flex flex-col gap-2">
                  {(currentQuestion.options as MCTFOption[]).map(
                    (opt, i) => {
                      const isSelected = selectedOption === i;
                      const isRevealed = phase === "revealed";
                      const isCorrect =
                        i === currentQuestion.correct_index;

                      let style =
                        "border-border bg-bg-surface hover:border-border-dark";
                      if (isRevealed && isCorrect)
                        style = "border-success bg-success-bg";
                      else if (isRevealed && isSelected && !isCorrect)
                        style = "border-danger bg-danger-bg";
                      else if (isSelected)
                        style = "border-primary bg-info-bg";

                      return (
                        <button
                          key={i}
                          onClick={() =>
                            !isRevealed && setSelectedOption(i)
                          }
                          disabled={isRevealed}
                          className={`px-4 py-3 border rounded-md text-left transition-colors ${style}`}
                        >
                          <span className="text-[15px] font-medium text-text-primary">
                            {opt.text}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* Multi-select options */}
              {currentType === "multiple_select" && (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-text-muted">
                    Select all that apply
                  </p>
                  {(currentQuestion.options as MCTFOption[]).map(
                    (opt, i) => {
                      const isSelected = msSelected.has(i);
                      const isRevealed = phase === "revealed";
                      const isCorrect = opt.is_correct;

                      let style =
                        "border-border bg-bg-surface hover:border-border-dark";
                      if (isRevealed && isCorrect)
                        style = "border-success bg-success-bg";
                      else if (isRevealed && isSelected && !isCorrect)
                        style = "border-danger bg-danger-bg";
                      else if (isSelected)
                        style = "border-primary bg-info-bg";

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (isRevealed) return;
                            setMsSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            });
                          }}
                          disabled={isRevealed}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-md text-left transition-colors ${style}`}
                        >
                          <span
                            className={`w-4 h-4 border rounded shrink-0 flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="text-[14px] text-text-primary">
                            {opt.text}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* Ordering */}
              {currentType === "ordering" && (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-text-muted">
                    Click items in the correct order
                  </p>
                  {(currentQuestion.options as OrderingOption[]).map(
                    (opt, i) => {
                      const seqPos = orderingSequence.indexOf(i);
                      const isPlaced = seqPos !== -1;
                      const isRevealed = phase === "revealed";
                      const correctPos = opt.correct_position;
                      const isCorrectPos =
                        isRevealed && isPlaced && seqPos === correctPos;

                      let style =
                        "border-border bg-bg-surface hover:border-border-dark";
                      if (isRevealed && isCorrectPos)
                        style = "border-success bg-success-bg";
                      else if (isRevealed && isPlaced && !isCorrectPos)
                        style = "border-danger bg-danger-bg";
                      else if (isPlaced)
                        style = "border-primary bg-info-bg";

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (isRevealed) return;
                            setOrderingSequence((prev) => {
                              if (prev.includes(i))
                                return prev.filter((x) => x !== i);
                              return [...prev, i];
                            });
                          }}
                          disabled={isRevealed}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-md text-left transition-colors ${style}`}
                        >
                          <span className="text-[13px] font-mono text-text-muted w-5 shrink-0">
                            {isPlaced ? seqPos + 1 : "-"}
                          </span>
                          <span className="text-[14px] text-text-primary">
                            {opt.text}
                          </span>
                        </button>
                      );
                    }
                  )}
                  {phase === "revealed" && (
                    <div className="mt-2 px-3 py-2 bg-bg-page border border-border rounded">
                      <p className="text-[12px] font-medium text-text-muted mb-1">
                        Correct order:
                      </p>
                      {[...(currentQuestion.options as OrderingOption[])]
                        .sort(
                          (a, b) => a.correct_position - b.correct_position
                        )
                        .map((opt, idx) => (
                          <p
                            key={idx}
                            className="text-[13px] text-text-secondary"
                          >
                            {idx + 1}. {opt.text}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Matching */}
              {currentType === "matching" && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] text-text-muted">
                    Select a term on the left, then its match on the right
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      {(currentQuestion.options as MatchingOption[]).map(
                        (opt, i) => {
                          const isPaired = matchingPairs.has(i);
                          const isActive = matchingLeft === i;
                          const isRevealed = phase === "revealed";
                          const isCorrectPair =
                            isRevealed && isPaired && matchingPairs.get(i) === i;

                          let style =
                            "border-border bg-bg-surface hover:border-border-dark";
                          if (isRevealed && isCorrectPair)
                            style = "border-success bg-success-bg";
                          else if (isRevealed && isPaired && !isCorrectPair)
                            style = "border-danger bg-danger-bg";
                          else if (isActive)
                            style = "border-primary bg-info-bg";
                          else if (isPaired) style = "border-primary/50 bg-info-bg/50";

                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isRevealed || isPaired) return;
                                setMatchingLeft(i);
                              }}
                              disabled={isRevealed || isPaired}
                              className={`px-3 py-2 border rounded-md text-left transition-colors ${style}`}
                            >
                              <span className="text-[13px] text-text-primary">
                                {opt.left}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {matchingRightOrder.map((origIdx) => {
                        const opt = (
                          currentQuestion.options as MatchingOption[]
                        )[origIdx];
                        const isPaired = [
                          ...matchingPairs.values(),
                        ].includes(origIdx);
                        const isRevealed = phase === "revealed";

                        let style =
                          "border-border bg-bg-surface hover:border-border-dark";
                        if (isPaired) style = "border-primary/50 bg-info-bg/50";

                        return (
                          <button
                            key={origIdx}
                            onClick={() => {
                              if (
                                isRevealed ||
                                isPaired ||
                                matchingLeft === null
                              )
                                return;
                              setMatchingPairs((prev) => {
                                const next = new Map(prev);
                                next.set(matchingLeft, origIdx);
                                return next;
                              });
                              setMatchingLeft(null);
                            }}
                            disabled={isRevealed || isPaired}
                            className={`px-3 py-2 border rounded-md text-left transition-colors ${style}`}
                          >
                            <span className="text-[13px] text-text-primary">
                              {opt.right}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {phase === "revealed" && (
                    <div className="mt-2 px-3 py-2 bg-bg-page border border-border rounded">
                      <p className="text-[12px] font-medium text-text-muted mb-1">
                        Correct matches:
                      </p>
                      {(currentQuestion.options as MatchingOption[]).map(
                        (opt, idx) => (
                          <p
                            key={idx}
                            className="text-[13px] text-text-secondary"
                          >
                            {opt.left} = {opt.right}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Explanation (revealed) */}
              {phase === "revealed" && currentQuestion.explanation && (
                <div className="mt-2 px-3 py-2 bg-bg-page border border-border rounded">
                  <p className="text-[13px] text-text-secondary">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-[13px] text-primary font-mono">
              {questions.length - currentIndex - (phase === "revealed" ? 1 : 0)}{" "}
              remaining
            </span>
            <div className="flex gap-3">
              {phase === "practicing" && (
                <Button onClick={checkAnswer} disabled={!isAnswerReady}>
                  Check Answer
                </Button>
              )}
              {phase === "revealed" && (
                <Button onClick={nextQuestion}>
                  {currentIndex + 1 >= questions.length
                    ? "Finish"
                    : "Next Question"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================================
  // RENDER: Overview
  // =======================================================================
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
              {studySet.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {studySet.category && (
                <span className="text-[15px] text-text-secondary">
                  {studySet.category}
                </span>
              )}
              <span className="text-[13px] font-mono text-text-muted">
                {questions.length} questions
              </span>
            </div>
            <p className="text-[13px] text-text-muted mt-2">
              Shared by {creatorName}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={startPractice}>
              Start Practice
            </Button>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign up to save progress
              </Button>
            </Link>
          </div>

          {/* Question preview */}
          <div>
            <h2 className="text-[16px] font-semibold text-text-primary mb-3">
              Questions
            </h2>
            <div className="flex flex-col gap-2">
              {questions.slice(0, 5).map((q, i) => {
                const qType = q.question_type || "multiple_choice";
                return (
                  <Card key={q.id} padding="sm">
                    <div className="flex items-start gap-2">
                      <p className="text-[14px] text-text-primary flex-1">
                        {i + 1}. {q.question_text}
                      </p>
                      {qType !== "multiple_choice" && (
                        <span className="shrink-0 text-[11px] font-mono text-text-muted bg-bg-page border border-border rounded px-1.5 py-0.5">
                          {TYPE_LABELS[qType]}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
              {questions.length > 5 && (
                <p className="text-[13px] text-text-muted">
                  + {questions.length - 5} more questions
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[13px] text-text-muted mt-8">
          Powered by{" "}
          <Link href="/" className="text-primary hover:underline">
            CertBench
          </Link>{" "}
          — AI-powered certification prep
        </p>
      </div>
    </div>
  );
}
