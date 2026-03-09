"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface GeneratedQuestion {
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  correct_index: number;
  explanation: string;
}

type Phase = "form" | "generating" | "review";

const QUESTION_COUNTS = [10, 25, 50] as const;
const DIFFICULTY_LEVELS = [
  { value: "mixed" as const, label: "Mixed", desc: "Balanced mix of difficulty" },
  { value: "easy" as const, label: "Easy", desc: "Recall and definitions" },
  { value: "medium" as const, label: "Medium", desc: "Understanding and comparison" },
  { value: "hard" as const, label: "Hard", desc: "Application and scenarios" },
];
type Difficulty = "mixed" | "easy" | "medium" | "hard";

export function StudyMaterialForm({
  certSlug,
}: {
  certSlug?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [sourcePreview, setSourcePreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const generate = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and study content are required.");
      return;
    }

    setError(null);
    setPhase("generating");

    try {
      const res = await fetch("/api/study-materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, questionCount, difficulty }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate questions");
        setPhase("form");
        return;
      }

      setQuestions(data.questions);
      setSourcePreview(data.sourcePreview || "");
      setPhase("review");
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }, [title, content, questionCount]);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveToLibrary = useCallback(async () => {
    if (questions.length === 0) {
      setError("No questions to save.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/study-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: category || undefined,
          questions,
          sourcePreview,
          certSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save study set");
        return;
      }

      router.push(`/study-materials/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [questions, title, category, sourcePreview, certSlug, router]);

  // Generating state
  if (phase === "generating") {
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
          Generating {questionCount} questions from your content...
        </p>
        <p className="text-[13px] text-text-muted">
          This may take 10–30 seconds.
        </p>
      </div>
    );
  }

  // Review state
  if (phase === "review") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Review Generated Questions
          </h1>
          <p className="text-[15px] text-text-secondary mt-1">
            {questions.length} questions for &ldquo;{title}&rdquo;. Remove any
            that don&rsquo;t look right.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-medium text-text-primary">
                    {i + 1}. {q.question_text}
                  </p>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="text-[12px] text-text-muted hover:text-danger transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
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
                {q.explanation && (
                  <p className="text-[12px] text-text-muted ml-4 mt-1">
                    {q.explanation}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {error && <p className="text-[14px] text-danger">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() => setPhase("form")}
          >
            Back to Edit
          </Button>
          <Button
            size="lg"
            onClick={saveToLibrary}
            loading={saving}
            disabled={questions.length === 0}
          >
            Save to Library ({questions.length} questions)
          </Button>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Create Study Material
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Paste your notes, textbook excerpts, or any study content. AI will
          generate practice questions from it.
        </p>
      </div>

      <Card padding="lg">
        <div className="flex flex-col gap-5">
          <Input
            label="Title"
            placeholder="e.g. Chapter 5 — Network Security"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Category (optional)"
            placeholder="e.g. Networking, Cryptography"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">
              Study Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your notes, textbook text, or any study material here..."
              rows={12}
              className="w-full px-3 py-2 text-[15px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary resize-y"
            />
            <p className="text-[12px] text-text-muted">
              {content.length.toLocaleString()} characters
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`px-4 py-2 text-[14px] font-medium rounded-md border transition-colors ${
                    questionCount === count
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
              Difficulty Level
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setDifficulty(level.value)}
                  className={`px-4 py-2 text-[14px] font-medium rounded-md border transition-colors ${
                    difficulty === level.value
                      ? "border-primary bg-blue-50 text-primary"
                      : "border-border bg-bg-surface text-text-secondary hover:border-border-dark"
                  }`}
                  title={level.desc}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-text-muted">
              {DIFFICULTY_LEVELS.find((l) => l.value === difficulty)?.desc}
            </p>
          </div>

          {error && <p className="text-[14px] text-danger">{error}</p>}

          <Button
            size="lg"
            onClick={generate}
            disabled={!title.trim() || !content.trim()}
          >
            Generate Questions
          </Button>
        </div>
      </Card>
    </div>
  );
}
