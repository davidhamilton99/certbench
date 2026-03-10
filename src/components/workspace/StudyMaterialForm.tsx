"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface UserPlan {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null;
  canGenerate: boolean;
}

type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

interface MCTFOption { text: string; is_correct: boolean }
interface OrderingOption { text: string; correct_position: number }
interface MatchingOption { left: string; right: string }

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi-Select",
  ordering: "Ordering",
  matching: "Matching",
};

interface GeneratedQuestion {
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation: string;
}

type Phase = "form" | "generating" | "validating" | "review";

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "multiple_select", label: "Multi-Select" },
  { value: "ordering", label: "Ordering" },
  { value: "matching", label: "Matching" },
];

const QUESTION_COUNTS = [10, 25, 50] as const;
const DIFFICULTY_LEVELS = [
  { value: "mixed" as const, label: "Mixed", desc: "Balanced mix of difficulty" },
  { value: "easy" as const, label: "Easy", desc: "Recall and definitions" },
  { value: "medium" as const, label: "Medium", desc: "Understanding and comparison" },
  { value: "hard" as const, label: "Hard", desc: "Application and scenarios" },
];
type Difficulty = "mixed" | "easy" | "medium" | "hard";

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.tsv,.pdf,.docx";
const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "csv", "tsv"];
const SERVER_PARSED_EXTENSIONS = ["pdf", "docx"];
const ALL_EXTENSIONS = [...PLAIN_TEXT_EXTENSIONS, ...SERVER_PARSED_EXTENSIONS];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function StudyMaterialForm({
  certSlug,
}: {
  certSlug?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(
    new Set(QUESTION_TYPE_OPTIONS.map((t) => t.value))
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [contentTruncated, setContentTruncated] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);

  // Fetch user plan on mount
  useEffect(() => {
    fetch("/api/user/plan")
      .then((res) => res.json())
      .then((data) => setUserPlan(data as UserPlan))
      .catch(() => {});
  }, []);

  // Auto-fill title from filename
  const autoFillTitle = useCallback(
    (fileName: string) => {
      if (!title.trim()) {
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
        setTitle(nameWithoutExt.replace(/[_-]/g, " "));
      }
    },
    [title]
  );

  // File reading handler — plain text client-side, PDF/DOCX server-side
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 10 MB.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALL_EXTENSIONS.includes(ext)) {
        setError(
          "Unsupported file type. Accepted: .txt, .md, .csv, .tsv, .pdf, .docx"
        );
        return;
      }

      // Plain text files — read client-side
      if (PLAIN_TEXT_EXTENSIONS.includes(ext)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === "string") {
            setContent(text);
            setUploadedFileName(file.name);
            setUploadedFileSize(file.size);
            autoFillTitle(file.name);
          }
        };
        reader.onerror = () => {
          setError("Failed to read file. Please try again.");
        };
        reader.readAsText(file);
        return;
      }

      // PDF/DOCX — send to server for text extraction
      if (SERVER_PARSED_EXTENSIONS.includes(ext)) {
        setFileLoading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/study-materials/extract-text", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Failed to extract text from file.");
            return;
          }

          setContent(data.text);
          setUploadedFileName(file.name);
          setUploadedFileSize(file.size);
          autoFillTitle(file.name);
        } catch {
          setError("Network error. Please try again.");
        } finally {
          setFileLoading(false);
        }
      }
    },
    [autoFillTitle]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const generate = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and study content are required.");
      return;
    }

    setError(null);
    setQuestions([]);
    setPhase("generating");

    try {
      const res = await fetch("/api/study-materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          questionCount,
          difficulty,
          questionTypes: [...selectedTypes],
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
        if (data.code === "GENERATION_LIMIT_REACHED") {
          setUserPlan((prev) => prev ? { ...prev, canGenerate: false } : prev);
        }
        setError(data.error || "Failed to generate questions");
        setPhase("form");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = part.slice(6);

          if (payload === "[DONE]") {
            setPhase("review");
            return;
          }

          const parsed = JSON.parse(payload) as {
            _type?: string;
            message?: string;
            sourcePreview?: string;
            contentTruncated?: boolean;
            index?: number;
            question?: GeneratedQuestion;
            reason?: string;
            count?: number;
          } & GeneratedQuestion;

          if (parsed._type === "error") {
            setError(parsed.message || "Failed to generate questions");
            setPhase("form");
            return;
          }
          if (parsed._type === "meta") {
            setSourcePreview(parsed.sourcePreview || "");
            if (parsed.contentTruncated) {
              setContentTruncated(true);
            }
            continue;
          }
          // Validation phase events
          if (parsed._type === "validating") {
            setPhase("validating");
            continue;
          }
          if (parsed._type === "validated") {
            // Question passed validation — no change needed
            continue;
          }
          if (parsed._type === "rewrite" && parsed.question != null && parsed.index != null) {
            // Replace question at index with improved version
            setQuestions((prev) =>
              prev.map((q, i) => (i === parsed.index ? parsed.question! : q))
            );
            continue;
          }
          if (parsed._type === "removed" && parsed.index != null) {
            // Mark question for removal by index
            setQuestions((prev) => prev.filter((_, i) => i !== parsed.index));
            continue;
          }

          // Regular question from generation phase
          if (!parsed._type) {
            setQuestions((prev) => [...prev, parsed]);
          }
        }
      }

      // Refresh plan after successful generation
      fetch("/api/user/plan")
        .then((r) => r.json())
        .then((d) => setUserPlan(d as UserPlan))
        .catch(() => {});

      setPhase("review");
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }, [title, content, questionCount, difficulty, selectedTypes]);

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

  // Generating / validating state
  if (phase === "generating" || phase === "validating") {
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
          {phase === "validating"
            ? "Checking question quality..."
            : "Generating questions..."}
        </p>
        {questions.length > 0 ? (
          <p className="text-[20px] font-mono font-semibold text-primary tabular-nums">
            {questions.length} / {questionCount}
          </p>
        ) : (
          <p className="text-[13px] text-text-muted">
            This may take 10-30 seconds.
          </p>
        )}
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
          {contentTruncated && (
            <p className="text-[13px] text-warning mt-2">
              Your content was trimmed to fit. Consider splitting large documents
              into multiple study sets for better coverage.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <Card key={i} padding="md">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <p className="text-[14px] font-medium text-text-primary">
                      {i + 1}. {q.question_text}
                    </p>
                    <span className="shrink-0 text-[11px] font-mono text-text-muted bg-bg-page border border-border rounded px-1.5 py-0.5 mt-0.5">
                      {QUESTION_TYPE_LABELS[q.question_type] || "MC"}
                    </span>
                  </div>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="text-[12px] text-text-muted hover:text-danger transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-1 ml-4">
                  {(!q.question_type ||
                    q.question_type === "multiple_choice" ||
                    q.question_type === "true_false") &&
                    (q.options as MCTFOption[]).map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = optIdx === q.correct_index;
                      return (
                        <span
                          key={optIdx}
                          className={`text-[13px] ${isCorrect ? "text-success font-medium" : "text-text-secondary"}`}
                        >
                          {letter}) {opt.text}
                          {isCorrect && " \u2713"}
                        </span>
                      );
                    })}
                  {q.question_type === "multiple_select" &&
                    (q.options as MCTFOption[]).map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <span
                          key={optIdx}
                          className={`text-[13px] ${opt.is_correct ? "text-success font-medium" : "text-text-secondary"}`}
                        >
                          {letter}) {opt.text}
                          {opt.is_correct && " \u2713"}
                        </span>
                      );
                    })}
                  {q.question_type === "ordering" &&
                    [...(q.options as OrderingOption[])]
                      .sort((a, b) => a.correct_position - b.correct_position)
                      .map((opt, idx) => (
                        <span key={idx} className="text-[13px] text-text-secondary">
                          {idx + 1}. {opt.text}
                        </span>
                      ))}
                  {q.question_type === "matching" &&
                    (q.options as MatchingOption[]).map((opt, idx) => (
                      <span key={idx} className="text-[13px] text-text-secondary">
                        {opt.left}{" "}
                        <span className="text-text-muted">→</span>{" "}
                        {opt.right}
                      </span>
                    ))}
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
          Upload a file or paste your notes. AI will generate practice
          questions from it.
        </p>
      </div>

      {/* Usage indicator / upgrade banner */}
      {userPlan && !userPlan.canGenerate && (
        <Card accent="primary" padding="lg">
          <div className="flex flex-col gap-3">
            <h2 className="text-[16px] font-semibold text-text-primary">
              Free generation limit reached
            </h2>
            <p className="text-[14px] text-text-secondary">
              You&apos;ve used all {userPlan.generationsLimit} free AI generations this month.
              Upgrade to Pro for unlimited quiz generation.
            </p>
            <div className="flex gap-3">
              <Link href="/pricing">
                <Button size="md">Upgrade to Pro — $8/mo</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {userPlan && userPlan.canGenerate && userPlan.plan === "free" && userPlan.generationsLimit && (
        <p className="text-[13px] text-text-muted">
          {userPlan.generationsLimit - userPlan.generationsUsed} of {userPlan.generationsLimit} free generations remaining this month.{" "}
          <Link href="/pricing" className="text-primary hover:underline">
            Upgrade for unlimited
          </Link>
        </p>
      )}

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

            {/* File upload drop zone — swaps to file info when a file is loaded */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileInput}
              className="hidden"
              disabled={fileLoading}
            />

            {uploadedFileName ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-page border border-border rounded-md">
                <svg
                  className="w-5 h-5 text-success shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    {uploadedFileName}
                  </span>
                  {uploadedFileSize != null && (
                    <span className="text-[11px] text-text-muted">
                      {uploadedFileSize < 1024
                        ? `${uploadedFileSize} B`
                        : uploadedFileSize < 1024 * 1024
                          ? `${(uploadedFileSize / 1024).toFixed(1)} KB`
                          : `${(uploadedFileSize / (1024 * 1024)).toFixed(1)} MB`}
                      {" · "}
                      {content.length.toLocaleString()} characters extracted
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-auto text-[12px] text-text-muted hover:text-danger transition-colors shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed rounded-md transition-colors ${
                  fileLoading
                    ? "border-primary bg-blue-50 cursor-wait"
                    : dragOver
                      ? "border-primary bg-blue-50 cursor-pointer"
                      : "border-border hover:border-border-dark bg-bg-surface cursor-pointer"
                }`}
                onClick={() => !fileLoading && fileInputRef.current?.click()}
              >
                {fileLoading ? (
                  <>
                    <svg
                      className="animate-spin w-6 h-6 text-primary"
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
                    <p className="text-[13px] text-text-secondary">
                      Extracting text from file...
                    </p>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <p className="text-[13px] text-text-secondary text-center">
                      <span className="text-primary font-medium">
                        Click to upload
                      </span>{" "}
                      or drag and drop a file
                    </p>
                    <p className="text-[11px] text-text-muted">
                      PDF, DOCX, TXT, MD, CSV — up to 10 MB
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-[12px] text-text-muted">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (uploadedFileName) {
                  setUploadedFileName(null);
                  setUploadedFileSize(null);
                }
              }}
              placeholder="Paste your notes, textbook text, or any study material here..."
              rows={5}
              className="w-full px-3 py-2 text-[15px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary resize-y min-h-[120px]"
              style={{ height: content ? undefined : "120px" }}
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
              Question Types
            </label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPE_OPTIONS.map((type) => {
                const isSelected = selectedTypes.has(type.value);
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedTypes((prev) => {
                        const next = new Set(prev);
                        if (isSelected && next.size > 1) {
                          next.delete(type.value);
                        } else {
                          next.add(type.value);
                        }
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-md border transition-colors ${
                      isSelected
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:border-border-dark"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-text-muted">
              {selectedTypes.size === QUESTION_TYPE_OPTIONS.length
                ? "All types — AI will choose the best mix"
                : `${selectedTypes.size} type${selectedTypes.size !== 1 ? "s" : ""} selected`}
            </p>
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
            disabled={!title.trim() || !content.trim() || (userPlan !== null && !userPlan.canGenerate)}
          >
            Generate Questions
          </Button>
        </div>
      </Card>
    </div>
  );
}
