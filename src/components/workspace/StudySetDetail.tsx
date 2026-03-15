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
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
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
  const [correctCount, setCorrectCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isPublic, setIsPublic] = useState(studySet.is_public);

  // --- Report state ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState<"success" | "already" | "error" | null>(null);

  const [localQuestions, setLocalQuestions] =
    useState<StudyQuestion[]>(initialQuestions);

  // --- Generate More state ---
  const [showGenerateMore, setShowGenerateMore] = useState(false);
  const [generateMoreCount, setGenerateMoreCount] = useState<5 | 10 | 15>(5);
  const [generateMoreContent, setGenerateMoreContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // --- MC/TF answer state ---
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionOrder, setOptionOrder] = useState<number[]>([0, 1, 2, 3]);

  // --- Multiple Select answer state ---
  const [msSelected, setMsSelected] = useState<Set<number>>(new Set());

  // --- Ordering answer state ---
  // List of original option indices in the order the user clicked them
  const [orderingSequence, setOrderingSequence] = useState<number[]>([]);

  // --- Matching answer state ---
  // Scrambled display order for right column: display position → original option index
  const [matchingRightOrder, setMatchingRightOrder] = useState<number[]>([]);
  // Currently selected left item (original option index), null if none
  const [matchingLeft, setMatchingLeft] = useState<number | null>(null);
  // Confirmed pairs: left original idx → right original idx
  const [matchingPairs, setMatchingPairs] = useState<Map<number, number>>(
    new Map()
  );

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
  const currentType: QuestionType =
    currentQuestion?.question_type || "multiple_choice";
  const progress =
    localQuestions.length > 0
      ? (currentIndex / localQuestions.length) * 100
      : 0;

  // Shuffled options + shuffled correct index — only used for MC
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

  // Whether the user has provided a valid answer for the current question type
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

  // -----------------------------------------------------------------------
  // Answer state reset
  // -----------------------------------------------------------------------

  const resetAnswerState = useCallback(() => {
    setSelectedOption(null);
    setMsSelected(new Set());
    setOrderingSequence([]);
    setMatchingLeft(null);
    setMatchingPairs(new Map());
  }, []);

  // Initialize type-specific state when moving to a question
  const initQuestionState = useCallback((q: StudyQuestion) => {
    const type = q.question_type || "multiple_choice";
    if (type === "multiple_choice") {
      setOptionOrder(shuffleIndices(q.options.length));
    } else if (type === "matching") {
      setMatchingRightOrder(shuffleIndices(q.options.length));
    }
  }, []);

  // -----------------------------------------------------------------------
  // Practice handlers
  // -----------------------------------------------------------------------

  const handleAnswer = useCallback(async () => {
    if (!currentQuestion) return;
    let isCorrect = false;

    switch (currentType) {
      case "multiple_choice": {
        if (selectedOption === null) return;
        isCorrect = selectedOption === shuffledCorrectIndex;
        break;
      }
      case "true_false": {
        if (selectedOption === null) return;
        isCorrect = selectedOption === currentQuestion.correct_index;
        break;
      }
      case "multiple_select": {
        if (msSelected.size === 0) return;
        const opts = currentQuestion.options as MCTFOption[];
        const correctSet = new Set(
          opts.map((o, i) => (o.is_correct ? i : -1)).filter((i) => i >= 0)
        );
        isCorrect =
          msSelected.size === correctSet.size &&
          [...msSelected].every((i) => correctSet.has(i));
        break;
      }
      case "ordering": {
        const opts = currentQuestion.options as OrderingOption[];
        if (orderingSequence.length !== opts.length) return;
        isCorrect = orderingSequence.every(
          (optIdx, pos) => opts[optIdx].correct_position === pos
        );
        break;
      }
      case "matching": {
        if (matchingPairs.size !== currentQuestion.options.length) return;
        // options[i].left correctly pairs with options[i].right,
        // so matchingPairs[leftIdx] should === leftIdx
        isCorrect = [...matchingPairs.entries()].every(
          ([leftIdx, rightIdx]) => rightIdx === leftIdx
        );
        break;
      }
    }

    if (isCorrect) setCorrectCount((c) => c + 1);
    setPhase("revealed");
  }, [
    selectedOption,
    currentQuestion,
    currentType,
    shuffledCorrectIndex,
    optionOrder,
    msSelected,
    orderingSequence,
    matchingPairs,
  ]);

  const handleNext = useCallback(() => {
    resetAnswerState();
    if (currentIndex < localQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = localQuestions[nextIdx];
      initQuestionState(nextQ);
      setCurrentIndex(nextIdx);
      setPhase("practicing");
    } else {
      setPhase("complete");
    }
  }, [
    currentIndex,
    localQuestions,
    resetAnswerState,
    initQuestionState,
  ]);

  const startPractice = useCallback(() => {
    setCurrentIndex(0);
    resetAnswerState();
    setCorrectCount(0);
    const firstQ = localQuestions[0];
    if (firstQ) initQuestionState(firstQ);
    setPhase("practicing");

    // Track attempt (fire-and-forget, non-owner only)
    if (!isOwner) {
      fetch("/api/community/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studySetId: studySet.id }),
      }).catch(() => {});
    }
  }, [resetAnswerState, initQuestionState, localQuestions, isOwner, studySet.id]);

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
      if (res.ok) router.push("/study-materials");
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
      if (res.ok) setIsPublic(!isPublic);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }, [studySet.id, isPublic]);

  const handleReport = useCallback(async () => {
    if (reportReason.trim().length < 5) return;
    setReportSubmitting(true);
    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySetId: studySet.id,
          reason: reportReason.trim(),
        }),
      });
      if (res.ok) {
        setReportResult("success");
      } else if (res.status === 409) {
        setReportResult("already");
      } else {
        setReportResult("error");
      }
    } catch {
      setReportResult("error");
    } finally {
      setReportSubmitting(false);
    }
  }, [studySet.id, reportReason]);

  // -----------------------------------------------------------------------
  // Export to PDF
  // -----------------------------------------------------------------------

  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPage = (needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(studySet.title, margin, y);
      y += 8;

      if (studySet.category) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(studySet.category, margin, y);
        doc.setTextColor(0);
        y += 6;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(
        `${localQuestions.length} questions — Generated by CertBench`,
        margin,
        y
      );
      doc.setTextColor(0);
      y += 10;

      // Questions
      localQuestions.forEach((q, i) => {
        const qType = q.question_type || "multiple_choice";
        const typeTag =
          qType !== "multiple_choice" ? ` [${TYPE_LABELS[qType]}]` : "";

        checkPage(30);

        // Question text
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const qLines = doc.splitTextToSize(
          `${i + 1}. ${q.question_text}${typeTag}`,
          contentWidth
        );
        doc.text(qLines, margin, y);
        y += qLines.length * 5 + 2;

        // Options
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (
          qType === "multiple_choice" ||
          qType === "true_false" ||
          qType === "multiple_select"
        ) {
          (q.options as MCTFOption[]).forEach((opt, optIdx) => {
            checkPage(6);
            const letter = String.fromCharCode(65 + optIdx);
            const optLines = doc.splitTextToSize(
              `   ${letter}) ${opt.text}`,
              contentWidth - 5
            );
            doc.text(optLines, margin, y);
            y += optLines.length * 4.5 + 1;
          });
        } else if (qType === "ordering") {
          (q.options as OrderingOption[]).forEach((opt, optIdx) => {
            checkPage(6);
            const optLines = doc.splitTextToSize(
              `   ${String.fromCharCode(65 + optIdx)}) ${opt.text}`,
              contentWidth - 5
            );
            doc.text(optLines, margin, y);
            y += optLines.length * 4.5 + 1;
          });
        } else if (qType === "matching") {
          (q.options as MatchingOption[]).forEach((opt, optIdx) => {
            checkPage(6);
            const optLines = doc.splitTextToSize(
              `   ${optIdx + 1}. ${opt.left}`,
              contentWidth - 5
            );
            doc.text(optLines, margin, y);
            y += optLines.length * 4.5 + 1;
          });
          y += 2;
          doc.setFont("helvetica", "italic");
          doc.text("   Definitions:", margin, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          const shuffled = [...(q.options as MatchingOption[])].sort(() =>
            Math.random() - 0.5
          );
          shuffled.forEach((opt, optIdx) => {
            checkPage(6);
            const optLines = doc.splitTextToSize(
              `   ${String.fromCharCode(65 + optIdx)}) ${opt.right}`,
              contentWidth - 5
            );
            doc.text(optLines, margin, y);
            y += optLines.length * 4.5 + 1;
          });
        }

        y += 4;
      });

      // Answer key on new page
      doc.addPage();
      y = margin;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Answer Key", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      localQuestions.forEach((q, i) => {
        checkPage(12);
        const qType = q.question_type || "multiple_choice";
        let answer = "";

        if (qType === "multiple_choice" || qType === "true_false") {
          const correct = (q.options as MCTFOption[])[q.correct_index];
          answer = `${String.fromCharCode(65 + q.correct_index)}) ${correct?.text || ""}`;
        } else if (qType === "multiple_select") {
          const correct = (q.options as MCTFOption[])
            .map((o, idx) => (o.is_correct ? String.fromCharCode(65 + idx) : null))
            .filter(Boolean);
          answer = correct.join(", ");
        } else if (qType === "ordering") {
          const sorted = [...(q.options as OrderingOption[])].sort(
            (a, b) => a.correct_position - b.correct_position
          );
          answer = sorted.map((o) => o.text).join(" → ");
        } else if (qType === "matching") {
          answer = (q.options as MatchingOption[])
            .map((o) => `${o.left} = ${o.right}`)
            .join("; ");
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}.`, margin, y);
        doc.setFont("helvetica", "normal");
        const ansLines = doc.splitTextToSize(answer, contentWidth - 10);
        doc.text(ansLines, margin + 8, y);
        y += ansLines.length * 4.5 + 1;

        if (q.explanation) {
          doc.setTextColor(80);
          const expLines = doc.splitTextToSize(q.explanation, contentWidth - 10);
          doc.text(expLines, margin + 8, y);
          doc.setTextColor(0);
          y += expLines.length * 4 + 3;
        }
      });

      const filename = studySet.title
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      doc.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  }, [studySet, localQuestions]);

  // -----------------------------------------------------------------------
  // Share link
  // -----------------------------------------------------------------------

  const [shareCopied, setShareCopied] = useState(false);

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}/share/${studySet.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [studySet.id]);

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
    const type = q.question_type || "multiple_choice";
    if (type === "matching") {
      setEditOptions(
        (q.options as MatchingOption[]).map((o) => `${o.left} → ${o.right}`)
      );
    } else if (type === "ordering") {
      setEditOptions((q.options as OrderingOption[]).map((o) => o.text));
    } else {
      setEditOptions((q.options as MCTFOption[]).map((o) => o.text));
    }
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
      const res = await fetch(`/api/study-materials/questions/${editingId}`, {
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
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save");
        return;
      }
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
        const res = await fetch(`/api/study-materials/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiImprove: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          setEditError(data.error || "AI improvement failed");
          setAiImproving(null);
          return;
        }
        // Build a StudyQuestion-shaped object from the AI response to reuse startEditing
        const improved: StudyQuestion = {
          ...q,
          question_text: data.question_text || q.question_text,
          options: data.options || q.options,
          correct_index: data.correct_index ?? q.correct_index,
          explanation: data.explanation || q.explanation,
        };
        startEditing(improved);
      } catch {
        setEditError("Network error during AI improvement.");
      } finally {
        setAiImproving(null);
      }
    },
    [startEditing]
  );

  // -----------------------------------------------------------------------
  // Matching helpers
  // -----------------------------------------------------------------------

  const handleMatchingLeftClick = useCallback(
    (leftIdx: number) => {
      if (matchingLeft === leftIdx) {
        setMatchingLeft(null); // deselect
      } else {
        setMatchingLeft(leftIdx); // switch active
      }
    },
    [matchingLeft]
  );

  const handleMatchingRightClick = useCallback(
    (displayPos: number) => {
      if (matchingLeft === null) return;
      const rightOrigIdx = matchingRightOrder[displayPos];
      const leftIdx = matchingLeft;
      setMatchingPairs((prev) => {
        const next = new Map(prev);
        // Remove any existing pair that uses this left or this right
        for (const [k, v] of next) {
          if (k === leftIdx || v === rightOrigIdx) next.delete(k);
        }
        next.set(leftIdx, rightOrigIdx);
        return next;
      });
      setMatchingLeft(null);
    },
    [matchingLeft, matchingRightOrder]
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

    // For MC: was the selected option correct?
    const isMCCorrect =
      isRevealed &&
      currentType === "multiple_choice" &&
      selectedOption === shuffledCorrectIndex;
    const isTFCorrect =
      isRevealed &&
      currentType === "true_false" &&
      selectedOption === currentQuestion.correct_index;

    // Generic "is answer correct" for result display
    let isCorrect = false;
    if (isRevealed) {
      if (currentType === "multiple_choice") isCorrect = isMCCorrect;
      else if (currentType === "true_false") isCorrect = isTFCorrect;
      else if (currentType === "multiple_select") {
        const opts = currentQuestion.options as MCTFOption[];
        const correctSet = new Set(
          opts.map((o, i) => (o.is_correct ? i : -1)).filter((i) => i >= 0)
        );
        isCorrect =
          msSelected.size === correctSet.size &&
          [...msSelected].every((i) => correctSet.has(i));
      } else if (currentType === "ordering") {
        const opts = currentQuestion.options as OrderingOption[];
        isCorrect =
          orderingSequence.length === opts.length &&
          orderingSequence.every(
            (optIdx, pos) => opts[optIdx].correct_position === pos
          );
      } else if (currentType === "matching") {
        isCorrect =
          matchingPairs.size === currentQuestion.options.length &&
          [...matchingPairs.entries()].every(
            ([leftIdx, rightIdx]) => rightIdx === leftIdx
          );
      }
    }

    const displayExplanation = currentQuestion.explanation;

    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Progress header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-mono text-text-muted">
              Question {currentIndex + 1} of {localQuestions.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-text-muted bg-bg-page border border-border rounded px-1.5 py-0.5">
                {TYPE_LABELS[currentType]}
              </span>
              <Badge variant="neutral">{studySet.title}</Badge>
            </div>
          </div>
          <ProgressBar value={progress} color="primary" size="sm" />
        </div>

        {/* Question */}
        <Card padding="lg">
          <p className="text-[15px] leading-relaxed text-text-primary">
            {currentQuestion.question_text}
          </p>
        </Card>

        {/* ---- Multiple Choice ---- */}
        {currentType === "multiple_choice" && (
          <div className="flex flex-col gap-2">
            {shuffledOptions.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selectedOption === index;
              const isCorrectOption = index === shuffledCorrectIndex;

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
        )}

        {/* ---- True / False ---- */}
        {currentType === "true_false" && (
          <div className="flex flex-col gap-2">
            {(currentQuestion.options as MCTFOption[]).map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrectOption =
                isRevealed && index === currentQuestion.correct_index;

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
                      {option.text[0]}
                    </span>
                    <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ---- Multiple Select ---- */}
        {currentType === "multiple_select" && (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-text-muted">
              {isRevealed ? "" : "Select all that apply."}
            </p>
            {(currentQuestion.options as MCTFOption[]).map((option, index) => {
              const isSelected = msSelected.has(index);
              const isCorrectOpt = option.is_correct;

              let borderStyle: string;
              let boxStyle: string;

              if (isRevealed) {
                if (isCorrectOpt && isSelected) {
                  borderStyle = "border-success bg-green-50 ring-1 ring-success";
                  boxStyle = "bg-success text-white";
                } else if (isCorrectOpt && !isSelected) {
                  // Missed correct
                  borderStyle = "border-success bg-green-50";
                  boxStyle = "border border-success text-success";
                } else if (!isCorrectOpt && isSelected) {
                  // Wrong selection
                  borderStyle = "border-danger bg-red-50 ring-1 ring-danger";
                  boxStyle = "bg-danger text-white";
                } else {
                  borderStyle = "border-border bg-bg-surface opacity-50";
                  boxStyle =
                    "bg-bg-page text-text-secondary border border-border";
                }
              } else if (isSelected) {
                borderStyle = "border-primary bg-blue-50 ring-1 ring-primary";
                boxStyle = "bg-primary text-white";
              } else {
                borderStyle =
                  "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
                boxStyle =
                  "bg-bg-page text-text-secondary border border-border";
              }

              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isRevealed) return;
                    setMsSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    });
                  }}
                  disabled={isRevealed}
                  className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-[13px] font-medium ${boxStyle}`}
                    >
                      {isRevealed && isCorrectOpt ? "\u2713" : isSelected ? "\u2713" : ""}
                    </span>
                    <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ---- Ordering ---- */}
        {currentType === "ordering" && (
          <div className="flex flex-col gap-2">
            {!isRevealed && (
              <p className="text-[12px] text-text-muted">
                Click items in the correct order. Click a numbered item to remove it from the sequence.
              </p>
            )}
            {(currentQuestion.options as OrderingOption[]).map(
              (option, origIdx) => {
                const posInSeq = orderingSequence.indexOf(origIdx);
                const seqNum = posInSeq >= 0 ? posInSeq + 1 : null;
                const isPlacedCorrectly =
                  isRevealed &&
                  seqNum !== null &&
                  option.correct_position === posInSeq;
                const isPlacedWrongly =
                  isRevealed &&
                  seqNum !== null &&
                  option.correct_position !== posInSeq;
                const wasNotPlaced = isRevealed && seqNum === null;

                let borderStyle: string;
                let numStyle: string;

                if (isRevealed) {
                  if (isPlacedCorrectly) {
                    borderStyle = "border-success bg-green-50";
                    numStyle = "bg-success text-white";
                  } else if (isPlacedWrongly) {
                    borderStyle = "border-danger bg-red-50";
                    numStyle = "bg-danger text-white";
                  } else if (wasNotPlaced) {
                    borderStyle = "border-border bg-bg-surface opacity-50";
                    numStyle =
                      "bg-bg-page text-text-secondary border border-border";
                  } else {
                    borderStyle = "border-border bg-bg-surface";
                    numStyle =
                      "bg-bg-page text-text-secondary border border-border";
                  }
                } else if (seqNum !== null) {
                  borderStyle = "border-primary bg-blue-50";
                  numStyle = "bg-primary text-white";
                } else {
                  borderStyle =
                    "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
                  numStyle =
                    "bg-bg-page text-text-secondary border border-border";
                }

                return (
                  <button
                    key={origIdx}
                    onClick={() => {
                      if (isRevealed) return;
                      setOrderingSequence((prev) => {
                        const existing = prev.indexOf(origIdx);
                        if (existing >= 0) {
                          return prev.filter((_, i) => i !== existing);
                        }
                        return [...prev, origIdx];
                      });
                    }}
                    disabled={isRevealed}
                    className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
                  >
                    <div className="flex gap-3">
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-mono font-medium ${numStyle}`}
                      >
                        {seqNum ?? "\u2013"}
                      </span>
                      <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              }
            )}
            {isRevealed && (
              <div className="mt-1 p-3 bg-bg-page rounded-lg border border-border">
                <p className="text-[12px] font-medium text-text-muted mb-1.5">
                  Correct order:
                </p>
                {[...(currentQuestion.options as OrderingOption[])]
                  .sort((a, b) => a.correct_position - b.correct_position)
                  .map((opt, i) => (
                    <p
                      key={i}
                      className="text-[13px] text-text-secondary leading-relaxed"
                    >
                      {i + 1}. {opt.text}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Matching ---- */}
        {currentType === "matching" && (
          <div className="flex flex-col gap-3">
            {!isRevealed && (
              <p className="text-[12px] text-text-muted">
                Click a term, then click its matching definition.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {/* Left column: terms */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Term
                </p>
                {(currentQuestion.options as MatchingOption[]).map(
                  (pair, leftIdx) => {
                    const isActive = matchingLeft === leftIdx;
                    const pairedRightOrigIdx = matchingPairs.get(leftIdx);
                    const isPaired = pairedRightOrigIdx !== undefined;
                    const isCorrectPair =
                      isRevealed && pairedRightOrigIdx === leftIdx;
                    const isWrongPair =
                      isRevealed &&
                      isPaired &&
                      pairedRightOrigIdx !== leftIdx;

                    let borderStyle: string;
                    if (isRevealed) {
                      borderStyle = isCorrectPair
                        ? "border-success bg-green-50"
                        : isWrongPair
                          ? "border-danger bg-red-50"
                          : "border-border bg-bg-surface opacity-50";
                    } else if (isActive) {
                      borderStyle =
                        "border-primary bg-blue-50 ring-2 ring-primary/30";
                    } else if (isPaired) {
                      borderStyle = "border-primary bg-blue-50";
                    } else {
                      borderStyle =
                        "border-border bg-bg-surface hover:border-border-dark";
                    }

                    return (
                      <button
                        key={leftIdx}
                        onClick={() =>
                          !isRevealed && handleMatchingLeftClick(leftIdx)
                        }
                        disabled={isRevealed}
                        className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 ${borderStyle}`}
                      >
                        <span className="text-[14px] text-text-primary leading-snug">
                          {pair.left}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Right column: definitions (scrambled) */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Definition
                </p>
                {matchingRightOrder.map((origRightIdx, displayPos) => {
                  const pair = (
                    currentQuestion.options as MatchingOption[]
                  )[origRightIdx];
                  const pairedLeftEntry = [
                    ...matchingPairs.entries(),
                  ].find(([, v]) => v === origRightIdx);
                  const isPaired = pairedLeftEntry !== undefined;
                  const isCorrectPair =
                    isRevealed &&
                    pairedLeftEntry !== undefined &&
                    pairedLeftEntry[0] === origRightIdx;
                  const isWrongPair =
                    isRevealed && isPaired && !isCorrectPair;
                  const isClickable = !isRevealed && matchingLeft !== null;

                  let borderStyle: string;
                  if (isRevealed) {
                    borderStyle = isCorrectPair
                      ? "border-success bg-green-50"
                      : isWrongPair
                        ? "border-danger bg-red-50"
                        : "border-border bg-bg-surface opacity-50";
                  } else if (isPaired) {
                    borderStyle = "border-primary bg-blue-50";
                  } else if (isClickable) {
                    borderStyle =
                      "border-border bg-bg-surface hover:border-primary hover:bg-blue-50";
                  } else {
                    borderStyle = "border-border bg-bg-surface";
                  }

                  return (
                    <button
                      key={origRightIdx}
                      onClick={() =>
                        isClickable && handleMatchingRightClick(displayPos)
                      }
                      disabled={isRevealed || matchingLeft === null}
                      className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 ${borderStyle}`}
                    >
                      <span className="text-[14px] text-text-primary leading-snug">
                        {pair.right}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Show correct pairs when revealed */}
            {isRevealed && (
              <div className="p-3 bg-bg-page rounded-lg border border-border">
                <p className="text-[12px] font-medium text-text-muted mb-1.5">
                  Correct matches:
                </p>
                {(currentQuestion.options as MatchingOption[]).map(
                  (pair, i) => (
                    <p
                      key={i}
                      className="text-[13px] text-text-secondary leading-relaxed"
                    >
                      {pair.left}{" "}
                      <span className="text-text-muted">→</span>{" "}
                      {pair.right}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Explanation section (shown after reveal) */}
        {isRevealed && displayExplanation && (
          <Card accent={isCorrect ? "success" : "danger"} padding="lg">
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-text-primary">
                {isCorrect ? "Correct" : "Incorrect"}
              </p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {displayExplanation}
              </p>
            </div>
          </Card>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text-muted">
            {localQuestions.length - currentIndex - 1} remaining
          </span>
          <div className="flex items-center gap-2">
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
                disabled={!isAnswerReady}
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

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Button size="lg" onClick={startPractice}>
          Practice Questions
        </Button>
        <Button variant="secondary" onClick={exportPdf} loading={exporting}>
          Export PDF
        </Button>
        {isPublic && (
          <Button variant="secondary" onClick={copyShareLink}>
            {shareCopied ? "Link Copied" : "Copy Share Link"}
          </Button>
        )}
        {isOwner ? (
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
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowReportModal(true)}
          >
            Report
          </Button>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card padding="lg" className="w-full max-w-md mx-4">
            {reportResult === "success" ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-[16px] font-semibold text-text-primary">
                  Report Submitted
                </h3>
                <p className="text-[14px] text-text-secondary">
                  Thank you for your report. We&#39;ll review this study set.
                </p>
                <Button onClick={() => { setShowReportModal(false); setReportResult(null); setReportReason(""); }}>
                  Close
                </Button>
              </div>
            ) : reportResult === "already" ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-[16px] font-semibold text-text-primary">
                  Already Reported
                </h3>
                <p className="text-[14px] text-text-secondary">
                  You&#39;ve already reported this study set. We&#39;ll review it soon.
                </p>
                <Button onClick={() => { setShowReportModal(false); setReportResult(null); }}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h3 className="text-[16px] font-semibold text-text-primary">
                  Report Study Set
                </h3>
                <p className="text-[14px] text-text-secondary">
                  Why are you reporting &ldquo;{studySet.title}&rdquo;?
                </p>
                <div className="flex flex-col gap-2">
                  {["Inappropriate or offensive content", "Spam or low quality", "Incorrect or misleading information", "Copyright violation"].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`text-left text-[14px] px-3 py-2 rounded-lg border transition-colors ${
                        reportReason === reason
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-border bg-bg-surface text-text-primary hover:bg-bg-page"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the issue (required)..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-lg placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {reportResult === "error" && (
                  <p className="text-[13px] text-danger">Failed to submit report. Please try again.</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => { setShowReportModal(false); setReportResult(null); setReportReason(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReport}
                    loading={reportSubmitting}
                    disabled={reportReason.trim().length < 5}
                  >
                    Submit Report
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Question list */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary mb-3">
          Questions
        </h2>
        <div className="flex flex-col gap-3">
          {localQuestions.map((q, i) => {
            const qType = q.question_type || "multiple_choice";
            const isMCEditSupported =
              qType === "multiple_choice" || qType === "true_false";

            return (
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
                          <div
                            key={optIdx}
                            className="flex items-center gap-2"
                          >
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
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        loading={editSaving}
                      >
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
                      <div className="flex items-start gap-2 flex-1">
                        <p className="text-[14px] font-medium text-text-primary">
                          {i + 1}. {q.question_text}
                        </p>
                        <span className="shrink-0 text-[11px] font-mono text-text-muted bg-bg-page border border-border rounded px-1.5 py-0.5 mt-0.5">
                          {TYPE_LABELS[qType]}
                        </span>
                      </div>
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
                          {isMCEditSupported && (
                            <>
                              <button
                                onClick={() => startEditing(q)}
                                className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-text-muted">|</span>
                            </>
                          )}
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="text-[12px] text-text-muted hover:text-danger transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Type-specific options display */}
                    <div className="flex flex-col gap-1 ml-4">
                      {(qType === "multiple_choice" ||
                        qType === "true_false") &&
                        (q.options as MCTFOption[]).map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrectOpt =
                            optIdx === q.correct_index;
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
                      {qType === "multiple_select" &&
                        (q.options as MCTFOption[]).map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <span
                              key={optIdx}
                              className={`text-[13px] ${
                                opt.is_correct
                                  ? "text-success font-medium"
                                  : "text-text-secondary"
                              }`}
                            >
                              {letter}) {opt.text}
                              {opt.is_correct && " \u2713"}
                            </span>
                          );
                        })}
                      {qType === "ordering" &&
                        [...(q.options as OrderingOption[])]
                          .sort((a, b) => a.correct_position - b.correct_position)
                          .map((opt, idx) => (
                            <span
                              key={idx}
                              className="text-[13px] text-text-secondary"
                            >
                              {idx + 1}. {opt.text}
                            </span>
                          ))}
                      {qType === "matching" &&
                        (q.options as MatchingOption[]).map((opt, idx) => (
                          <span
                            key={idx}
                            className="text-[13px] text-text-secondary"
                          >
                            {opt.left}{" "}
                            <span className="text-text-muted">→</span>{" "}
                            {opt.right}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
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
                  <Button onClick={handleGenerateMore} loading={generating}>
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
