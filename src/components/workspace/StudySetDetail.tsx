"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

// Fisher-Yates shuffle — returns a new shuffled array of indices
function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

interface StudySet {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  question_count: number;
  is_public: boolean;
  created_at: string;
  source_material_preview?: string | null;
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
  questions: initialQuestions,
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

  // Mutable local questions list (for editing/generating more without reload)
  const [localQuestions, setLocalQuestions] =
    useState<StudyQuestion[]>(initialQuestions);

  // --- AI Tutor state ---
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const [deeperExplanation, setDeeperExplanation] = useState<string | null>(
    null
  );
  const [deeperLoading, setDeeperLoading] = useState(false);
  const [deeperUsed, setDeeperUsed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // --- Generate More state ---
  const [showGenerateMore, setShowGenerateMore] = useState(false);
  const [generateMoreCount, setGenerateMoreCount] = useState<5 | 10 | 15>(5);
  const [generateMoreContent, setGenerateMoreContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // --- Option shuffle state ---
  // Maps shuffled display index → original option index for each question.
  // Re-generated when currentIndex changes (via startPractice / handleNext).
  const [optionOrder, setOptionOrder] = useState<number[]>([0, 1, 2, 3]);

  // --- Question Editing state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>(["", "", "", ""]);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const [editExplanation, setEditExplanation] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [aiImproving, setAiImproving] = useState<string | null>(null);

  const currentQuestion = localQuestions[currentIndex];
  const progress =
    localQuestions.length > 0
      ? (currentIndex / localQuestions.length) * 100
      : 0;

  // Derive shuffled options and the shuffled correct index from the current question
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return optionOrder.map((origIdx) => currentQuestion.options[origIdx]);
  }, [currentQuestion, optionOrder]);

  // The correct answer's position within the shuffled display
  const shuffledCorrectIndex = useMemo(() => {
    if (!currentQuestion) return 0;
    return optionOrder.indexOf(currentQuestion.correct_index);
  }, [currentQuestion, optionOrder]);

  // -----------------------------------------------------------------------
  // AI Tutor helpers
  // -----------------------------------------------------------------------

  const callAiTutor = useCallback(
    async (
      mode: "explain_wrong" | "hint" | "explain_more",
      extras?: {
        selectedIndex?: number;
        previousExplanation?: string;
      }
    ) => {
      if (!currentQuestion) return null;
      try {
        const res = await fetch("/api/study-materials/ai-tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            questionText: currentQuestion.question_text,
            options: currentQuestion.options,
            correctIndex: currentQuestion.correct_index,
            selectedIndex: extras?.selectedIndex,
            sourceContext: studySet.source_material_preview || undefined,
            previousExplanation: extras?.previousExplanation,
          }),
        });

        if (res.status === 429) {
          return {
            error: "Too many AI requests. Please wait a moment.",
          };
        }

        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || "AI unavailable" };
        }
        return { content: data.content as string };
      } catch {
        return { error: "Network error" };
      }
    },
    [currentQuestion, studySet.source_material_preview]
  );

  const requestHint = useCallback(async () => {
    if (hintUsed || hintLoading) return;
    setHintLoading(true);
    setAiError(null);

    const result = await callAiTutor("hint");
    if (result?.content) {
      setHintText(result.content);
    } else {
      setAiError(result?.error || "Could not generate hint.");
    }
    setHintUsed(true);
    setHintLoading(false);
  }, [hintUsed, hintLoading, callAiTutor]);

  const requestDeeperExplanation = useCallback(async () => {
    if (deeperUsed || deeperLoading) return;
    setDeeperLoading(true);

    const displayedExplanation =
      aiExplanation || currentQuestion?.explanation || "";
    const result = await callAiTutor("explain_more", {
      previousExplanation: displayedExplanation,
    });

    if (result?.content) {
      setDeeperExplanation(result.content);
    }
    setDeeperUsed(true);
    setDeeperLoading(false);
  }, [
    deeperUsed,
    deeperLoading,
    callAiTutor,
    aiExplanation,
    currentQuestion,
  ]);

  // Reset all per-question AI state
  const resetAiState = useCallback(() => {
    setHintText(null);
    setHintLoading(false);
    setHintUsed(false);
    setAiExplanation(null);
    setAiExplanationLoading(false);
    setDeeperExplanation(null);
    setDeeperLoading(false);
    setDeeperUsed(false);
    setAiError(null);
  }, []);

  // -----------------------------------------------------------------------
  // Practice handlers
  // -----------------------------------------------------------------------

  const handleAnswer = useCallback(async () => {
    if (selectedOption === null || !currentQuestion) return;
    // selectedOption is the shuffled display index; compare against shuffled correct
    const isCorrect = selectedOption === shuffledCorrectIndex;

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    }
    setPhase("revealed");

    // If wrong, auto-trigger AI explanation — pass original index to AI
    if (!isCorrect) {
      setAiExplanationLoading(true);
      const originalSelectedIndex = optionOrder[selectedOption];
      const result = await callAiTutor("explain_wrong", {
        selectedIndex: originalSelectedIndex,
      });
      if (result?.content) {
        setAiExplanation(result.content);
      }
      // If AI fails, we'll fall back to static explanation in the UI
      setAiExplanationLoading(false);
    }
  }, [selectedOption, currentQuestion, callAiTutor, shuffledCorrectIndex, optionOrder]);

  const handleNext = useCallback(() => {
    setSelectedOption(null);
    resetAiState();
    if (currentIndex < localQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setOptionOrder(shuffleIndices(4));
      setPhase("practicing");
    } else {
      setPhase("complete");
    }
  }, [currentIndex, localQuestions.length, resetAiState]);

  const startPractice = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    resetAiState();
    setOptionOrder(shuffleIndices(4));
    setPhase("practicing");
  }, [resetAiState]);

  // -----------------------------------------------------------------------
  // Set management handlers
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Generate More handler
  // -----------------------------------------------------------------------

  const handleGenerateMore = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/study-materials/generate-more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: studySet.id,
          questionCount: generateMoreCount,
          additionalContent: generateMoreContent.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || "Failed to generate questions");
        return;
      }

      // Append new questions to local state
      setLocalQuestions((prev) => [...prev, ...data.questions]);
      setShowGenerateMore(false);
      setGenerateMoreContent("");
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [studySet.id, generateMoreCount, generateMoreContent]);

  // -----------------------------------------------------------------------
  // Question Editing handlers
  // -----------------------------------------------------------------------

  const startEditing = useCallback((q: StudyQuestion) => {
    setEditingId(q.id);
    setEditQuestion(q.question_text);
    setEditOptions(q.options.map((o) => o.text));
    setEditCorrectIndex(q.correct_index);
    setEditExplanation(q.explanation || "");
    setEditError(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);

    try {
      const res = await fetch(
        `/api/study-materials/questions/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: editQuestion,
            options: editOptions.map((text, i) => ({
              text,
              is_correct: i === editCorrectIndex,
            })),
            correctIndex: editCorrectIndex,
            explanation: editExplanation,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save");
        return;
      }

      // Update local state
      setLocalQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                question_text: editQuestion,
                options: editOptions.map((text, i) => ({
                  text,
                  is_correct: i === editCorrectIndex,
                })),
                correct_index: editCorrectIndex,
                explanation: editExplanation,
              }
            : q
        )
      );
      setEditingId(null);
    } catch {
      setEditError("Network error.");
    } finally {
      setEditSaving(false);
    }
  }, [editingId, editQuestion, editOptions, editCorrectIndex, editExplanation]);

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      if (!confirm("Delete this question?")) return;
      try {
        const res = await fetch(
          `/api/study-materials/questions/${questionId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setLocalQuestions((prev) => prev.filter((q) => q.id !== questionId));
          if (editingId === questionId) setEditingId(null);
        }
      } catch {
        // ignore
      }
    },
    [editingId]
  );

  const improveWithAi = useCallback(
    async (q: StudyQuestion) => {
      setAiImproving(q.id);

      try {
        const res = await fetch(
          `/api/study-materials/questions/${q.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiImprove: true }),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          setEditError(data.error || "AI improvement failed");
          setAiImproving(null);
          return;
        }

        // Populate edit form with improved data for review
        startEditing(q);
        if (data.question_text) setEditQuestion(data.question_text);
        if (data.options) {
          setEditOptions(
            data.options.map((o: { text: string }) => o.text)
          );
          const correctIdx = data.options.findIndex(
            (o: { is_correct: boolean }) => o.is_correct
          );
          if (correctIdx >= 0) setEditCorrectIndex(correctIdx);
        }
        if (data.explanation) setEditExplanation(data.explanation);
      } catch {
        setEditError("Network error during AI improvement.");
      } finally {
        setAiImproving(null);
      }
    },
    [startEditing]
  );

  // =======================================================================
  // RENDER: Complete screen
  // =======================================================================

  if (phase === "complete") {
    const pct = Math.round((correctCount / localQuestions.length) * 100);
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
                {correctCount} / {localQuestions.length} correct
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

  // =======================================================================
  // RENDER: Practice / Revealed screen
  // =======================================================================

  if (
    (phase === "practicing" || phase === "revealed") &&
    currentQuestion
  ) {
    const isRevealed = phase === "revealed";
    const isCorrect =
      isRevealed && selectedOption === shuffledCorrectIndex;

    // Determine which explanation to show
    const displayExplanation =
      isRevealed && !isCorrect && aiExplanation
        ? aiExplanation
        : currentQuestion.explanation;

    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Progress header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-mono text-text-muted">
              Question {currentIndex + 1} of {localQuestions.length}
            </span>
            <Badge variant="neutral">{studySet.title}</Badge>
          </div>
          <ProgressBar value={progress} color="primary" size="sm" />
        </div>

        {/* Question */}
        <Card padding="lg">
          <p className="text-[15px] leading-relaxed text-text-primary">
            {currentQuestion.question_text}
          </p>
        </Card>

        {/* Options (shuffled order) */}
        <div className="flex flex-col gap-2">
          {shuffledOptions.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = selectedOption === index;
            const isCorrectOption = index === shuffledCorrectIndex;

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

        {/* Hint card (shown during practicing phase) */}
        {!isRevealed && hintText && (
          <Card accent="primary" padding="lg">
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-medium text-primary">Hint</p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {hintText}
              </p>
            </div>
          </Card>
        )}

        {/* AI error (non-blocking) */}
        {!isRevealed && aiError && (
          <p className="text-[13px] text-text-muted">{aiError}</p>
        )}

        {/* Explanation section (shown after reveal) */}
        {isRevealed && (
          <>
            {/* Loading state for AI explanation (wrong answers only) */}
            {!isCorrect && aiExplanationLoading && !aiExplanation && (
              <Card accent="danger" padding="lg">
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-medium text-text-primary">
                    Incorrect
                  </p>
                  <p className="text-[13px] text-text-muted animate-pulse">
                    AI is analysing your answer...
                  </p>
                </div>
              </Card>
            )}

            {/* Explanation card (AI or static) */}
            {(!aiExplanationLoading || aiExplanation) &&
              displayExplanation && (
                <Card
                  accent={isCorrect ? "success" : "danger"}
                  padding="lg"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-text-primary">
                        {isCorrect ? "Correct" : "Incorrect"}
                      </p>
                      {!isCorrect && aiExplanation && (
                        <Badge variant="neutral">AI Tutor</Badge>
                      )}
                    </div>
                    <p className="text-[13px] text-text-secondary leading-relaxed">
                      {displayExplanation}
                    </p>
                  </div>
                </Card>
              )}

            {/* Explain More button */}
            {!deeperUsed && !deeperLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={requestDeeperExplanation}
              >
                Explain More
              </Button>
            )}

            {/* Deeper explanation loading */}
            {deeperLoading && (
              <p className="text-[13px] text-text-muted animate-pulse">
                Generating deeper explanation...
              </p>
            )}

            {/* Deeper explanation card */}
            {deeperExplanation && (
              <Card accent="primary" padding="lg">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-primary">
                      Deep Dive
                    </p>
                    <Badge variant="neutral">AI Tutor</Badge>
                  </div>
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    {deeperExplanation}
                  </p>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text-muted">
            {localQuestions.length - currentIndex - 1} remaining
          </span>
          <div className="flex items-center gap-2">
            {/* Hint button (only during practicing phase) */}
            {!isRevealed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={requestHint}
                loading={hintLoading}
                disabled={hintUsed}
              >
                {hintUsed ? "Hint Used" : "Get a Hint"}
              </Button>
            )}

            {isRevealed ? (
              <Button size="lg" onClick={handleNext}>
                {currentIndex === localQuestions.length - 1
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
      </div>
    );
  }

  // =======================================================================
  // RENDER: Overview screen
  // =======================================================================

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
            {localQuestions.length} questions
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
          {localQuestions.map((q, i) => (
            <Card key={q.id} padding="md">
              {editingId === q.id ? (
                /* ----- Inline editing mode ----- */
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-text-muted">
                      Question
                    </label>
                    <textarea
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-text-muted">
                      Options (select the correct answer)
                    </label>
                    {editOptions.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={editCorrectIndex === optIdx}
                            onChange={() => setEditCorrectIndex(optIdx)}
                            className="accent-primary"
                          />
                          <span className="text-[13px] font-mono text-text-muted w-4">
                            {letter})
                          </span>
                          <input
                            value={opt}
                            onChange={(e) =>
                              setEditOptions((prev) =>
                                prev.map((o, j) =>
                                  j === optIdx ? e.target.value : o
                                )
                              )
                            }
                            className="flex-1 px-2 py-1.5 text-[13px] text-text-primary bg-bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-text-muted">
                      Explanation
                    </label>
                    <textarea
                      value={editExplanation}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-[13px] text-text-primary bg-bg-surface border border-border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  {editError && (
                    <p className="text-[13px] text-danger">{editError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} loading={editSaving}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteQuestion(q.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                /* ----- Normal display mode ----- */
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] font-medium text-text-primary">
                      {i + 1}. {q.question_text}
                    </p>
                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => improveWithAi(q)}
                          disabled={aiImproving === q.id}
                          className="text-[12px] text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {aiImproving === q.id
                            ? "Improving..."
                            : "Improve with AI"}
                        </button>
                        <span className="text-text-muted">|</span>
                        <button
                          onClick={() => startEditing(q)}
                          className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 ml-4">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrectOpt = optIdx === q.correct_index;
                      return (
                        <span
                          key={optIdx}
                          className={`text-[13px] ${
                            isCorrectOpt
                              ? "text-success font-medium"
                              : "text-text-secondary"
                          }`}
                        >
                          {letter}) {opt.text}
                          {isCorrectOpt && " \u2713"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Generate More Questions (owner only) */}
      {isOwner && (
        <div>
          {!showGenerateMore ? (
            <Button
              variant="secondary"
              onClick={() => setShowGenerateMore(true)}
            >
              Add More Questions
            </Button>
          ) : (
            <Card padding="lg">
              <div className="flex flex-col gap-4">
                <h3 className="text-[15px] font-semibold text-text-primary">
                  Generate More Questions
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    How many?
                  </label>
                  <div className="flex gap-2">
                    {([5, 10, 15] as const).map((count) => (
                      <button
                        key={count}
                        onClick={() => setGenerateMoreCount(count)}
                        className={`px-4 py-2 text-[14px] font-medium rounded-md border transition-colors ${
                          generateMoreCount === count
                            ? "border-primary bg-blue-50 text-primary"
                            : "border-border bg-bg-surface text-text-secondary hover:border-border-dark"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Additional content (optional)
                  </label>
                  <textarea
                    value={generateMoreContent}
                    onChange={(e) => setGenerateMoreContent(e.target.value)}
                    placeholder="Paste additional study material to generate from, or leave blank to use the original content..."
                    rows={4}
                    className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {generateError && (
                  <p className="text-[14px] text-danger">{generateError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateMore}
                    loading={generating}
                  >
                    Generate {generateMoreCount} Questions
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowGenerateMore(false);
                      setGenerateError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
