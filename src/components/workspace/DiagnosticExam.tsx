"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DiagnosticResults } from "@/components/workspace/DiagnosticResults";

interface ExamQuestion {
  id: string;
  domain_id: string;
  question_text: string;
  options: { text: string }[];
}

interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  timeSpentSeconds: number;
}

interface ResultsData {
  correctCount: number;
  totalQuestions: number;
  readiness: {
    overall_score: number;
    domain_scores: {
      domain_id: string;
      domain_number: string;
      title: string;
      exam_weight: number;
      raw_score: number;
      confidence_factor: number;
      attempted: number;
      correct: number;
    }[];
    is_preliminary: boolean;
  };
  questions: {
    id: string;
    question_text: string;
    options: { text: string; is_correct: boolean }[];
    correct_index: number;
    explanation: string;
    domain_id: string;
  }[];
  responses: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
}

type Phase = "intro" | "exam" | "submitting" | "results";

export function DiagnosticExam({
  certificationId,
  certName,
  certSlug,
}: {
  certificationId: string;
  certName: string;
  certSlug: string;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const questionStartTime = useRef(Date.now());

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  // Reset timer when navigating to new question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const startExam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start diagnostic");
        return;
      }

      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setPhase("exam");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [certificationId]);

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
    const answer: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex: selectedOption,
      timeSpentSeconds: timeSpent,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitExam(newAnswers);
    }
  }, [selectedOption, currentQuestion, answers, currentIndex, questions.length]);

  const submitExam = useCallback(
    async (finalAnswers: AnswerRecord[]) => {
      setPhase("submitting");
      try {
        const res = await fetch("/api/diagnostic/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers: finalAnswers }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to submit diagnostic");
          setPhase("exam");
          return;
        }

        setResults(data);
        setPhase("results");
      } catch {
        setError("Network error. Please try again.");
        setPhase("exam");
      }
    },
    [attemptId]
  );

  // Intro screen
  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Diagnostic Exam
          </h1>
          <p className="text-[15px] text-text-secondary mt-1">{certName}</p>
        </div>

        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold text-text-primary">
              Before you begin
            </h2>
            <ul className="text-[15px] text-text-secondary space-y-2">
              <li>
                <span className="font-medium text-text-primary">25 questions</span>{" "}
                across all exam domains, weighted by exam blueprint.
              </li>
              <li>
                No time limit — take as long as you need on each question.
              </li>
              <li>
                Your results determine your starting readiness score and
                personalised study plan.
              </li>
              <li>
                You cannot retake the diagnostic. Treat it as a genuine baseline
                assessment.
              </li>
            </ul>

            {error && (
              <p className="text-[14px] text-danger">{error}</p>
            )}

            <Button size="lg" onClick={startExam} loading={loading}>
              Start Diagnostic
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Submitting screen
  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-[15px] text-text-secondary">
          Grading your diagnostic and computing readiness score...
        </p>
      </div>
    );
  }

  // Results screen
  if (phase === "results" && results) {
    return (
      <DiagnosticResults
        results={results}
        certName={certName}
        certSlug={certSlug}
      />
    );
  }

  // Exam screen
  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Progress header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-mono text-text-muted">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <Badge variant="neutral">Diagnostic</Badge>
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

          return (
            <button
              key={index}
              onClick={() => setSelectedOption(index)}
              className={`
                w-full text-left p-4 rounded-lg border transition-colors duration-150
                ${
                  isSelected
                    ? "border-primary bg-blue-50 ring-1 ring-primary"
                    : "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page"
                }
              `}
            >
              <div className="flex gap-3">
                <span
                  className={`
                    flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    text-[13px] font-mono font-medium
                    ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-bg-page text-text-secondary border border-border"
                    }
                  `}
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-muted">
          {questions.length - currentIndex - 1} remaining
        </span>
        <Button
          size="lg"
          onClick={handleNext}
          disabled={selectedOption === null}
        >
          {currentIndex === questions.length - 1
            ? "Submit Diagnostic"
            : "Next Question"}
        </Button>
      </div>

      {error && (
        <p className="text-[14px] text-danger">{error}</p>
      )}
    </div>
  );
}
