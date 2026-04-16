"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DiagnosticResults } from "@/components/workspace/DiagnosticResults";
import { shuffleArray } from "@/lib/shuffle-options";

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

interface PersistedExamState {
  attemptId: string;
  questions: ExamQuestion[];
  answers: AnswerRecord[];
  currentIndex: number;
  shuffleMaps: Record<string, number[]>;
  savedAt: number;
}

const DIAGNOSTIC_STORAGE_PREFIX = "certbench_diagnostic_";
const EXAM_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  const router = useRouter();
  const storageKey = `${DIAGNOSTIC_STORAGE_PREFIX}${certificationId}`;

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const questionStartTime = useRef(0);
  const shuffleMaps = useRef<Map<string, number[]>>(new Map());

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  // Check for a saved exam session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved: PersistedExamState = JSON.parse(raw);
      if (Date.now() - saved.savedAt > EXAM_STATE_MAX_AGE_MS) {
        localStorage.removeItem(storageKey);
        return;
      }
      setHasSavedSession(true);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Auto-save exam state whenever answers change (localStorage + server)
  useEffect(() => {
    if (phase !== "exam" || questions.length === 0) return;
    const state: PersistedExamState = {
      attemptId,
      questions,
      answers,
      currentIndex,
      shuffleMaps: Object.fromEntries(shuffleMaps.current),
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full — non-critical
    }

    // Debounced save to server
    const timeout = setTimeout(() => {
      fetch("/api/diagnostic/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          state: {
            questions,
            answers,
            currentIndex,
            shuffleMaps: Object.fromEntries(shuffleMaps.current),
          },
        }),
      }).catch(() => {});
    }, 1000);

    return () => clearTimeout(timeout);
  }, [phase, attemptId, questions, answers, currentIndex, storageKey]);

  const clearSavedSession = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasSavedSession(false);
  }, [storageKey]);

  const resumeSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved: PersistedExamState = JSON.parse(raw);
      setAttemptId(saved.attemptId);
      setQuestions(saved.questions);
      setAnswers(saved.answers);
      setCurrentIndex(saved.currentIndex);
      shuffleMaps.current = new Map(Object.entries(saved.shuffleMaps));
      setPhase("exam");
      setHasSavedSession(false);
    } catch {
      clearSavedSession();
    }
  }, [storageKey, clearSavedSession]);

  const exitExam = useCallback(() => {
    // Progress is already auto-saved by the useEffect above
    router.push(`/dashboard?cert=${certSlug}`);
  }, [router, certSlug]);

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

      // Shuffle options so correct answer isn't always at the same index
      const maps = new Map<string, number[]>();
      const shuffledQuestions = (data.questions as ExamQuestion[]).map((q) => {
        const { shuffled, toOriginal } = shuffleArray(q.options);
        maps.set(q.id, toOriginal);
        return { ...q, options: shuffled };
      });
      shuffleMaps.current = maps;

      setQuestions(shuffledQuestions);
      setPhase("exam");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [certificationId]);

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
        clearSavedSession();
      } catch {
        setError("Network error. Please try again.");
        setPhase("exam");
      }
    },
    [attemptId, clearSavedSession]
  );

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
    // Map shuffled index back to original DB index for grading
    const toOriginal = shuffleMaps.current.get(currentQuestion.id);
    const originalIndex = toOriginal ? toOriginal[selectedOption] : selectedOption;

    const answer: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex: originalIndex,
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
  }, [selectedOption, currentQuestion, answers, currentIndex, questions.length, submitExam]);

  // Keyboard shortcuts for selecting options and advancing
  useEffect(() => {
    if (phase !== "exam" || !currentQuestion) return;
    function handleKeyDown(e: KeyboardEvent) {
      const numKey = parseInt(e.key, 10);
      if (numKey >= 1 && numKey <= currentQuestion.options.length) {
        setSelectedOption(numKey - 1);
        return;
      }
      const letterIndex = e.key.toLowerCase().charCodeAt(0) - 97;
      if (letterIndex >= 0 && letterIndex < currentQuestion.options.length && e.key.length === 1) {
        setSelectedOption(letterIndex);
        return;
      }
      if (e.key === "Enter" && selectedOption !== null) {
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, currentQuestion, selectedOption, handleNext]);

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
              <p className="text-[14px] text-text-secondary">{error}</p>
            )}

            {hasSavedSession ? (
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={resumeSession}>
                  Resume Previous Attempt
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    clearSavedSession();
                    startExam();
                  }}
                  loading={loading}
                >
                  Start Fresh
                </Button>
              </div>
            ) : (
              <Button size="lg" onClick={startExam} loading={loading}>
                Start Diagnostic
              </Button>
            )}
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
          <span className="text-[12px] font-mono text-text-muted">DIAGNOSTIC</span>
        </div>
        <ProgressBar value={progress} size="sm" />
      </div>

      {/* Question */}
      <Card padding="lg">
        <p id="question-text" className="text-[15px] leading-relaxed text-text-primary">
          {currentQuestion.question_text}
        </p>
      </Card>

      {/* Options */}
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="question-text">
        {currentQuestion.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              onClick={() => setSelectedOption(index)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${letter}: ${option.text}`}
              className={`
                w-full text-left p-4 rounded-lg border transition-colors duration-150
                ${
                  isSelected
                    ? "border-primary bg-info-bg ring-1 ring-primary"
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
        <div className="flex items-center gap-3">
          <button
            onClick={exitExam}
            className="text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-page"
          >
            Exit
          </button>
          <span className="text-[13px] text-text-muted">
            {questions.length - currentIndex - 1} remaining
          </span>
        </div>
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
        <p className="text-[14px] text-text-secondary" role="alert">{error}</p>
      )}
    </div>
  );
}
