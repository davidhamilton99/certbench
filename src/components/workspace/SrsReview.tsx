"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { shuffleArray } from "@/lib/shuffle-options";

interface SrsQuestion {
  id: string;
  domain_id: string;
  question_text: string;
  options: { text: string }[];
  correct_index: number;
  explanation: string;
}

interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

type Phase = "loading" | "empty" | "reviewing" | "revealed" | "submitting" | "complete";

export function SrsReview({
  certificationId,
  certName,
  certSlug,
}: {
  certificationId: string;
  certName: string;
  certSlug: string;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<SrsQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    correctCount: number;
    totalReviewed: number;
  } | null>(null);
  const questionStartTime = useRef(Date.now());
  const shuffleMaps = useRef<Map<string, number[]>>(new Map());

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  // Load SRS cards on mount
  useEffect(() => {
    const controller = new AbortController();

    async function loadCards() {
      try {
        const res = await fetch("/api/srs-review/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certificationId }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load review cards");
          return;
        }

        if (data.questions.length === 0) {
          setPhase("empty");
          return;
        }

        // Shuffle options so correct answer isn't always at the same index
        const maps = new Map<string, number[]>();
        const shuffledQuestions = (data.questions as SrsQuestion[]).map((q) => {
          const { shuffled, toOriginal } = shuffleArray(q.options);
          maps.set(q.id, toOriginal);
          // Find new position of the correct answer after shuffle
          const newCorrectIndex = toOriginal.indexOf(q.correct_index);
          return { ...q, options: shuffled, correct_index: newCorrectIndex };
        });
        shuffleMaps.current = maps;

        setQuestions(shuffledQuestions);
        setPhase("reviewing");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error. Please try again.");
      }
    }

    loadCards();
    return () => controller.abort();
  }, [certificationId]);

  const handleAnswer = useCallback(() => {
    if (selectedOption === null) return;
    setPhase("revealed");
  }, [selectedOption]);

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const timeSpent = Math.round(
      (Date.now() - questionStartTime.current) / 1000
    );
    const isCorrect = selectedOption === currentQuestion.correct_index;
    // Map shuffled index back to original DB index
    const toOriginal = shuffleMaps.current.get(currentQuestion.id);
    const originalIndex = toOriginal ? toOriginal[selectedOption] : selectedOption;

    const answer: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex: originalIndex,
      isCorrect,
      timeSpentSeconds: timeSpent,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPhase("reviewing");
    } else {
      submitReview(newAnswers);
    }
  }, [selectedOption, currentQuestion, answers, currentIndex, questions.length]);

  const submitReview = useCallback(
    async (finalAnswers: AnswerRecord[]) => {
      setPhase("submitting");
      try {
        const res = await fetch("/api/srs-review/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certificationId, answers: finalAnswers }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to submit review");
          return;
        }

        setSummary({
          correctCount: data.correctCount,
          totalReviewed: data.totalReviewed,
        });
        setPhase("complete");
      } catch {
        setError("Network error. Please try again.");
      }
    },
    [certificationId]
  );

  // Loading
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-[15px] text-text-secondary">
          Loading review cards...
        </p>
        {error && <p className="text-[14px] text-danger">{error}</p>}
      </div>
    );
  }

  // No cards due
  if (phase === "empty") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Spaced Repetition Review
          </h1>
          <p className="text-[15px] text-text-secondary mt-1">{certName}</p>
        </div>

        <Card padding="lg">
          <p className="text-[15px] text-text-secondary">
            No cards due for review right now. Come back later or continue
            practising to build your review queue.
          </p>
        </Card>

        <Link href={`/dashboard?cert=${certSlug}`}>
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Submitting
  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-[15px] text-text-secondary">
          Updating review schedule...
        </p>
      </div>
    );
  }

  // Complete
  if (phase === "complete" && summary) {
    const pct = Math.round(
      (summary.correctCount / summary.totalReviewed) * 100
    );

    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Review Complete
          </h1>
          <p className="text-[15px] text-text-secondary mt-1">{certName}</p>
        </div>

        <Card padding="lg">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-[48px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {pct}%
              </span>
              <span className="text-[15px] text-text-muted">
                {summary.correctCount} / {summary.totalReviewed} correct
              </span>
            </div>
            <ProgressBar value={pct} size="md" />
            <p className="text-[14px] text-text-secondary">
              Cards answered correctly have been scheduled for later review.
              Incorrect cards will appear again soon.
            </p>
          </div>
        </Card>

        <Link href={`/dashboard?cert=${certSlug}`}>
          <Button size="lg">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Review screen
  if (!currentQuestion) return null;

  const isRevealed = phase === "revealed";
  const isCorrect =
    isRevealed && selectedOption === currentQuestion.correct_index;
  const progress =
    questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Progress header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-mono text-text-muted">
            Card {currentIndex + 1} of {questions.length}
          </span>
          <Badge variant="neutral">SRS Review</Badge>
        </div>
        <ProgressBar value={progress} color="primary" size="sm" />
      </div>

      {/* Question */}
      <Card padding="lg">
        <p className="text-[15px] leading-relaxed text-text-primary">
          {currentQuestion.question_text}
        </p>
      </Card>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {currentQuestion.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selectedOption === index;
          const isCorrectOption = index === currentQuestion.correct_index;

          let borderStyle: string;
          let circleStyle: string;

          if (isRevealed) {
            if (isCorrectOption) {
              borderStyle = "border-success bg-green-50 ring-1 ring-success";
              circleStyle = "bg-success text-white";
            } else if (isSelected && !isCorrectOption) {
              borderStyle = "border-danger bg-red-50 ring-1 ring-danger";
              circleStyle = "bg-danger text-white";
            } else {
              borderStyle = "border-border bg-bg-surface opacity-50";
              circleStyle =
                "bg-bg-page text-text-secondary border border-border";
            }
          } else if (isSelected) {
            borderStyle = "border-primary bg-blue-50 ring-1 ring-primary";
            circleStyle = "bg-primary text-white";
          } else {
            borderStyle =
              "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
            circleStyle =
              "bg-bg-page text-text-secondary border border-border";
          }

          return (
            <button
              key={index}
              onClick={() => !isRevealed && setSelectedOption(index)}
              disabled={isRevealed}
              className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-mono font-medium ${circleStyle}`}
                >
                  {letter}
                </span>
                <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                  {option.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Revealed feedback */}
      {isRevealed && (
        <Card accent={isCorrect ? "success" : "danger"} padding="lg">
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-text-primary">
              {isCorrect ? "Correct" : "Incorrect"}
            </p>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {currentQuestion.explanation.length > 500
                ? currentQuestion.explanation.substring(0, 500) + "..."
                : currentQuestion.explanation}
            </p>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-muted">
          {questions.length - currentIndex - 1} remaining
        </span>
        {isRevealed ? (
          <Button size="lg" onClick={handleNext}>
            {currentIndex === questions.length - 1
              ? "Finish Review"
              : "Next Card"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleAnswer}
            disabled={selectedOption === null}
          >
            Check Answer
          </Button>
        )}
      </div>

      {error && <p className="text-[14px] text-danger">{error}</p>}
    </div>
  );
}
