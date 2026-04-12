"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PracticeExamResults } from "@/components/workspace/PracticeExamResults";
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
  isFlagged: boolean;
}

interface PersistedExamState {
  attemptId: string;
  questions: ExamQuestion[];
  answers: AnswerRecord[];
  currentIndex: number;
  flagged: number[];
  shuffleMaps: Record<string, number[]>;
  savedAt: number;
}

const EXAM_STORAGE_PREFIX = "certbench_exam_";
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
  } | null;
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

const examTypeLabels: Record<string, string> = {
  full: "Full Practice Exam",
  domain_drill: "Domain Drill",
  weak_points: "Weak Points Review",
};

const examTypeDescriptions: Record<string, string> = {
  full: "90 questions across all domains, weighted by exam blueprint. Simulates the real exam experience.",
  domain_drill:
    "10 focused questions from a single domain to strengthen specific areas.",
  weak_points:
    "10 questions targeting your weakest areas across all domains.",
};

export function PracticeExam({
  certificationId,
  certName,
  certSlug,
  examType,
  domainId,
  domainTitle,
}: {
  certificationId: string;
  certName: string;
  certSlug: string;
  examType: "full" | "domain_drill" | "weak_points";
  domainId?: string;
  domainTitle?: string;
}) {
  const router = useRouter();
  const storageKey = `${EXAM_STORAGE_PREFIX}${certificationId}_${examType}`;

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const questionStartTime = useRef(0);
  const shuffleMaps = useRef<Map<string, number[]>>(new Map());

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  // Check for a saved exam session on mount (localStorage first, then server)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: PersistedExamState = JSON.parse(raw);
        if (Date.now() - saved.savedAt <= EXAM_STATE_MAX_AGE_MS) {
          setHasSavedSession(true);
          return;
        }
        localStorage.removeItem(storageKey);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }

    // Fallback: check server for saved progress
    (async () => {
      try {
        const res = await fetch(
          `/api/practice-exam/progress?certificationId=${certificationId}&examType=${examType}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.progress) {
          // Write to localStorage so resumeSession works uniformly
          const state: PersistedExamState = {
            attemptId: data.progress.attemptId,
            questions: data.progress.questions,
            answers: data.progress.answers,
            currentIndex: data.progress.currentIndex,
            flagged: data.progress.flagged,
            shuffleMaps: data.progress.shuffleMaps,
            savedAt: data.progress.savedAt,
          };
          localStorage.setItem(storageKey, JSON.stringify(state));
          setHasSavedSession(true);
        }
      } catch {
        // Non-critical
      }
    })();
  }, [storageKey, certificationId, examType]);

  // Persist exam state whenever answers change during the exam
  useEffect(() => {
    if (phase !== "exam" || questions.length === 0) return;
    try {
      const state: PersistedExamState = {
        attemptId,
        questions,
        answers,
        currentIndex,
        flagged: Array.from(flagged),
        shuffleMaps: Object.fromEntries(shuffleMaps.current),
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — non-critical
    }
  }, [phase, attemptId, questions, answers, currentIndex, flagged, storageKey]);

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
      setFlagged(new Set(saved.flagged));
      shuffleMaps.current = new Map(Object.entries(saved.shuffleMaps));
      setPhase("exam");
      setHasSavedSession(false);
    } catch {
      clearSavedSession();
    }
  }, [storageKey, clearSavedSession]);

  const saveAndExit = useCallback(async () => {
    // Save to localStorage
    try {
      const state: PersistedExamState = {
        attemptId,
        questions,
        answers,
        currentIndex,
        flagged: Array.from(flagged),
        shuffleMaps: Object.fromEntries(shuffleMaps.current),
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full — non-critical
    }

    // Save to server (fire and forget)
    try {
      await fetch("/api/practice-exam/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          state: {
            questions,
            answers,
            currentIndex,
            flagged: Array.from(flagged),
            shuffleMaps: Object.fromEntries(shuffleMaps.current),
          },
        }),
      });
    } catch {
      // Non-critical — localStorage is the primary store
    }

    router.push(`/dashboard?cert=${certSlug}`);
  }, [attemptId, questions, answers, currentIndex, flagged, storageKey, router, certSlug]);

  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const startExam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationId, examType, domainId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start exam");
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
  }, [certificationId, examType, domainId]);

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  }, [currentIndex]);

  const submitExam = useCallback(
    async (finalAnswers: AnswerRecord[]) => {
      setPhase("submitting");
      try {
        const res = await fetch("/api/practice-exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers: finalAnswers }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to submit exam");
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

    const timeSpent = Math.round(
      (Date.now() - questionStartTime.current) / 1000
    );
    // Map shuffled index back to original DB index for grading
    const toOriginal = shuffleMaps.current.get(currentQuestion.id);
    const originalIndex = toOriginal ? toOriginal[selectedOption] : selectedOption;

    const answer: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex: originalIndex,
      timeSpentSeconds: timeSpent,
      isFlagged: flagged.has(currentIndex),
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitExam(newAnswers);
    }
  }, [
    selectedOption,
    currentQuestion,
    answers,
    currentIndex,
    questions.length,
    flagged,
    submitExam,
  ]);

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
    const title =
      examType === "domain_drill" && domainTitle
        ? `Domain Drill: ${domainTitle}`
        : examTypeLabels[examType];

    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            {title}
          </h1>
          <p className="text-[15px] text-text-secondary mt-1">{certName}</p>
        </div>

        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <p className="text-[15px] text-text-secondary">
              {examTypeDescriptions[examType]}
            </p>
            <ul className="text-[15px] text-text-secondary space-y-2">
              <li>
                Questions are selected based on your performance history —
                prioritising areas that need work.
              </li>
              <li>You can flag questions for later review.</li>
              <li>Your readiness score will update when you finish.</li>
            </ul>

            {error && <p className="text-[14px] text-text-secondary">{error}</p>}

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
                Start {examType === "full" ? "Exam" : "Practice"}
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
          Grading your exam and updating readiness score...
        </p>
      </div>
    );
  }

  // Results screen
  if (phase === "results" && results) {
    return (
      <PracticeExamResults
        results={results}
        certName={certName}
        certSlug={certSlug}
        examType={examType}
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFlag}
              aria-label={flagged.has(currentIndex) ? "Unflag this question" : "Flag this question for review"}
              className={`text-[13px] font-medium px-2 py-1 rounded transition-colors ${
                flagged.has(currentIndex)
                  ? "text-primary bg-info-bg"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {flagged.has(currentIndex) ? "Flagged" : "Flag"}
            </button>
            <span className="text-[12px] font-mono text-text-muted">{examTypeLabels[examType].toUpperCase()}</span>
          </div>
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
            onClick={saveAndExit}
            className="text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-page"
          >
            Save &amp; Exit
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
            ? "Submit Exam"
            : "Next Question"}
        </Button>
      </div>

      {error && <p className="text-[14px] text-text-secondary" role="alert">{error}</p>}
    </div>
  );
}
