"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface StudySet {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  question_count: number;
  is_public: boolean;
  created_at: string;
}

interface StudyQuestion {
  id: string;
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

type Phase = "overview" | "practicing" | "revealed" | "complete";

export function StudySetDetail({
  studySet,
  questions,
  isOwner,
}: {
  studySet: StudySet;
  questions: StudyQuestion[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isPublic, setIsPublic] = useState(studySet.is_public);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  const handleAnswer = useCallback(() => {
    if (selectedOption === null) return;
    if (selectedOption === currentQuestion.correct_index) {
      setCorrectCount((c) => c + 1);
    }
    setPhase("revealed");
  }, [selectedOption, currentQuestion]);

  const handleNext = useCallback(() => {
    setSelectedOption(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPhase("practicing");
    } else {
      setPhase("complete");
    }
  }, [currentIndex, questions.length]);

  const startPractice = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setPhase("practicing");
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this study set? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/study-materials/${studySet.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/study-materials");
      }
    } catch {
      setDeleting(false);
    }
  }, [studySet.id, router]);

  const togglePublic = useCallback(async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/study-materials/${studySet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }, [studySet.id, isPublic]);

  // Complete screen
  if (phase === "complete") {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Practice Complete
        </h1>
        <Card padding="lg">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-[48px] font-mono font-semibold text-text-primary tabular-nums leading-none">
                {pct}%
              </span>
              <span className="text-[15px] text-text-muted">
                {correctCount} / {questions.length} correct
              </span>
            </div>
            <ProgressBar value={pct} size="md" />
          </div>
        </Card>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={startPractice}>
            Practice Again
          </Button>
          <Link href="/study-materials">
            <Button>Back to Library</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Practice / Revealed screen
  if (
    (phase === "practicing" || phase === "revealed") &&
    currentQuestion
  ) {
    const isRevealed = phase === "revealed";
    const isCorrect =
      isRevealed && selectedOption === currentQuestion.correct_index;

    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-mono text-text-muted">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <Badge variant="neutral">{studySet.title}</Badge>
          </div>
          <ProgressBar value={progress} color="primary" size="sm" />
        </div>

        <Card padding="lg">
          <p className="text-[15px] leading-relaxed text-text-primary">
            {currentQuestion.question_text}
          </p>
        </Card>

        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = selectedOption === index;
            const isCorrectOption =
              index === currentQuestion.correct_index;

            let borderStyle: string;
            let circleStyle: string;

            if (isRevealed) {
              if (isCorrectOption) {
                borderStyle =
                  "border-success bg-green-50 ring-1 ring-success";
                circleStyle = "bg-success text-white";
              } else if (isSelected && !isCorrectOption) {
                borderStyle =
                  "border-danger bg-red-50 ring-1 ring-danger";
                circleStyle = "bg-danger text-white";
              } else {
                borderStyle = "border-border bg-bg-surface opacity-50";
                circleStyle =
                  "bg-bg-page text-text-secondary border border-border";
              }
            } else if (isSelected) {
              borderStyle =
                "border-primary bg-blue-50 ring-1 ring-primary";
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

        {isRevealed && currentQuestion.explanation && (
          <Card accent={isCorrect ? "success" : "danger"} padding="lg">
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-text-primary">
                {isCorrect ? "Correct" : "Incorrect"}
              </p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text-muted">
            {questions.length - currentIndex - 1} remaining
          </span>
          {isRevealed ? (
            <Button size="lg" onClick={handleNext}>
              {currentIndex === questions.length - 1
                ? "Finish"
                : "Next Question"}
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
      </div>
    );
  }

  // Overview screen
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
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
          {isPublic && <Badge variant="neutral">Public</Badge>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={startPractice}>
          Practice Questions
        </Button>
        {isOwner && (
          <>
            <Button
              variant="secondary"
              onClick={togglePublic}
              loading={toggling}
            >
              {isPublic ? "Make Private" : "Share Publicly"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              loading={deleting}
            >
              Delete Set
            </Button>
          </>
        )}
      </div>

      {/* Question list */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary mb-3">
          Questions
        </h2>
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <Card key={q.id} padding="md">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-text-primary">
                  {i + 1}. {q.question_text}
                </p>
                <div className="flex flex-col gap-1 ml-4">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = optIdx === q.correct_index;
                    return (
                      <span
                        key={optIdx}
                        className={`text-[13px] ${
                          isCorrect
                            ? "text-success font-medium"
                            : "text-text-secondary"
                        }`}
                      >
                        {letter}) {opt.text}
                        {isCorrect && " ✓"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
