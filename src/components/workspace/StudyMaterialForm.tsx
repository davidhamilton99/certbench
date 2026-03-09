"use client";

import { useState, useCallback, useRef } from "react";
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
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

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
    setContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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
  }, [title, content, questionCount, difficulty]);

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
          Upload a file or paste your notes. AI will generate practice
          questions from it.
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

            {/* File upload drop zone */}
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
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileInput}
                className="hidden"
                disabled={fileLoading}
              />
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

            {/* Uploaded file indicator */}
            {uploadedFileName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-page border border-border rounded-md">
                <svg
                  className="w-4 h-4 text-success shrink-0"
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
                <span className="text-[13px] text-text-primary truncate">
                  {uploadedFileName}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="ml-auto text-[12px] text-text-muted hover:text-danger transition-colors shrink-0"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-[11px] text-text-muted uppercase tracking-wider">
                or paste directly
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (uploadedFileName) setUploadedFileName(null);
              }}
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
