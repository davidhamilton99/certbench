"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

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

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; desc: string; icon: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice", desc: "Pick one correct answer", icon: "A" },
  { value: "true_false", label: "True / False", desc: "Binary true or false", icon: "T" },
  { value: "multiple_select", label: "Multi-Select", desc: "Select all that apply", icon: "+" },
  { value: "ordering", label: "Ordering", desc: "Arrange in correct sequence", icon: "#" },
  { value: "matching", label: "Matching", desc: "Pair related items", icon: "=" },
];

const DEFAULT_QUESTION_COUNT = 25;

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.tsv,.pdf,.docx,.png,.jpg,.jpeg,.webp";
const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "csv", "tsv"];
const SERVER_PARSED_EXTENSIONS = ["pdf", "docx", "png", "jpg", "jpeg", "webp"];
const ALL_EXTENSIONS = [...PLAIN_TEXT_EXTENSIONS, ...SERVER_PARSED_EXTENSIONS];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Generate" },
  { number: 3, label: "Review" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-mono font-semibold transition-colors
                ${currentStep > step.number
                  ? "bg-success text-white"
                  : currentStep === step.number
                    ? "bg-primary text-white"
                    : "bg-bg-page text-text-muted border border-border"
                }
              `}
            >
              {currentStep > step.number ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                step.number
              )}
            </span>
            <span
              className={`text-[13px] font-medium hidden sm:inline ${
                currentStep >= step.number ? "text-text-primary" : "text-text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 sm:w-10 h-px ${currentStep > step.number ? "bg-success" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      {description && <p className="text-[13px] text-text-muted">{description}</p>}
    </div>
  );
}

export function StudyMaterialForm({
  certSlug,
  certName,
  domains,
}: {
  certSlug?: string;
  certName?: string;
  domains?: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [sourcePreview, setSourcePreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [domainTag, setDomainTag] = useState("");
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
          "Unsupported file type. Accepted: .txt, .md, .csv, .tsv, .pdf, .docx, .png, .jpg, .webp"
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

      // PDF/DOCX/images — send to server for text extraction
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
          if (parsed._type === "validating") {
            setPhase("validating");
            continue;
          }
          if (parsed._type === "validated") {
            continue;
          }
          if (parsed._type === "rewrite" && parsed.question != null && parsed.index != null) {
            setQuestions((prev) =>
              prev.map((q, i) => (i === parsed.index ? parsed.question! : q))
            );
            continue;
          }
          if (parsed._type === "removed" && parsed.index != null) {
            setQuestions((prev) => prev.filter((_, i) => i !== parsed.index));
            continue;
          }

          if (!parsed._type) {
            setQuestions((prev) => [...prev, parsed]);
          }
        }
      }

      fetch("/api/user/plan")
        .then((r) => r.json())
        .then((d) => setUserPlan(d as UserPlan))
        .catch(() => {});

      setPhase("review");
    } catch {
      setError("Network error. Please try again.");
      setPhase("form");
    }
  }, [title, content, selectedTypes]);

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
          domainTag: domainTag || undefined,
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
  }, [questions, title, category, sourcePreview, certSlug, domainTag, router]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentStep = phase === "form" ? 1 : phase === "review" ? 3 : 2;

  // ─── Generating / validating state ─────────────────────────────
  if (phase === "generating" || phase === "validating") {
    const targetCount = DEFAULT_QUESTION_COUNT;
    const pct = targetCount > 0 ? Math.min(100, Math.round((questions.length / targetCount) * 100)) : 0;

    return (
      <div className="flex flex-col gap-8 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Create Study Material
          </h1>
          <StepIndicator currentStep={currentStep} />
        </div>

        <Card padding="lg">
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            {/* Animated ring */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r="36" fill="none"
                  stroke="var(--color-primary)" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[18px] font-mono font-semibold text-primary tabular-nums">
                {questions.length}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[16px] font-semibold text-text-primary">
                {phase === "validating"
                  ? "Checking question quality"
                  : "Generating questions"}
              </p>
              <p className="text-[14px] text-text-secondary">
                {questions.length > 0
                  ? `${questions.length} questions created`
                  : "Analyzing your content..."}
              </p>
            </div>

            <ProgressBar value={pct} size="md" color="primary" />

            <p className="text-[12px] text-text-muted">
              {phase === "validating"
                ? "Verifying accuracy and improving weak questions"
                : "This usually takes 15\u201345 seconds"}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Review state ──────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
              Review Questions
            </h1>
            <p className="text-[14px] text-text-secondary mt-0.5">
              {questions.length} questions for &ldquo;{title}&rdquo;
            </p>
          </div>
          <StepIndicator currentStep={3} />
        </div>

        {contentTruncated && (
          <Card accent="warning" padding="md">
            <p className="text-[13px] text-text-secondary">
              Your content was trimmed to fit the context window. Consider splitting large documents into multiple study sets for better coverage.
            </p>
          </Card>
        )}

        {/* Summary bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-bg-page border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-text-muted">Questions</span>
            <Badge variant="neutral">{questions.length}</Badge>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-text-muted">Types</span>
            <div className="flex gap-1">
              {[...new Set(questions.map(q => q.question_type))].map(t => (
                <span key={t} className="text-[11px] font-mono bg-bg-surface border border-border rounded px-1.5 py-0.5 text-text-secondary">
                  {QUESTION_TYPE_LABELS[t] || t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Question cards */}
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <Card key={i} padding="md" className="group">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-page border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-text-muted mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-[14px] font-medium text-text-primary leading-snug">
                        {q.question_text}
                      </p>
                      <span className="text-[11px] font-mono text-text-muted">
                        {QUESTION_TYPE_LABELS[q.question_type] || "MC"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="opacity-0 group-hover:opacity-100 text-[12px] text-text-muted hover:text-danger transition-all shrink-0 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex flex-col gap-1 ml-9">
                  {(!q.question_type ||
                    q.question_type === "multiple_choice" ||
                    q.question_type === "true_false") &&
                    (q.options as MCTFOption[]).map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = optIdx === q.correct_index;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-start gap-2 text-[13px] px-2 py-1 rounded ${
                            isCorrect ? "bg-green-50 text-success" : "text-text-secondary"
                          }`}
                        >
                          <span className={`font-mono text-[12px] ${isCorrect ? "font-semibold" : ""}`}>{letter})</span>
                          <span className={isCorrect ? "font-medium" : ""}>{opt.text}</span>
                          {isCorrect && (
                            <svg className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  {q.question_type === "multiple_select" &&
                    (q.options as MCTFOption[]).map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-start gap-2 text-[13px] px-2 py-1 rounded ${
                            opt.is_correct ? "bg-green-50 text-success" : "text-text-secondary"
                          }`}
                        >
                          <span className={`font-mono text-[12px] ${opt.is_correct ? "font-semibold" : ""}`}>{letter})</span>
                          <span className={opt.is_correct ? "font-medium" : ""}>{opt.text}</span>
                          {opt.is_correct && (
                            <svg className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  {q.question_type === "ordering" &&
                    [...(q.options as OrderingOption[])]
                      .sort((a, b) => a.correct_position - b.correct_position)
                      .map((opt, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[13px] text-text-secondary px-2 py-1">
                          <span className="font-mono text-[12px]">{idx + 1}.</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                  {q.question_type === "matching" &&
                    (q.options as MatchingOption[]).map((opt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[13px] text-text-secondary px-2 py-1">
                        <span className="font-medium text-text-primary">{opt.left}</span>
                        <span className="text-text-muted">&rarr;</span>
                        <span>{opt.right}</span>
                      </div>
                    ))}
                </div>

                {q.explanation && (
                  <p className="text-[12px] text-text-muted ml-9 px-2 py-1.5 bg-bg-page rounded leading-relaxed">
                    {q.explanation}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {error && (
          <Card accent="danger" padding="md">
            <p className="text-[14px] text-danger">{error}</p>
          </Card>
        )}

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 bg-bg-page border-t border-border -mx-6 px-6 py-4 mt-2 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setPhase("form")}
          >
            Back to Editor
          </Button>
          <Button
            size="lg"
            onClick={saveToLibrary}
            loading={saving}
            disabled={questions.length === 0}
          >
            Save to Library
          </Button>
        </div>
      </div>
    );
  }

  // ─── Form state ────────────────────────────────────────────────
  const hasContent = content.trim().length > 0;
  const hasTitle = title.trim().length > 0;
  const canGenerate = hasTitle && hasContent && !fileLoading && (userPlan === null || userPlan.canGenerate);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Create Study Material
          </h1>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Upload your notes and AI will generate practice questions.
          </p>
        </div>
        <StepIndicator currentStep={1} />
      </div>

      {/* Usage indicator / upgrade banner */}
      {userPlan && !userPlan.canGenerate && (
        <Card accent="primary" padding="lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-[15px] font-semibold text-text-primary">
                Free generation limit reached
              </h2>
              <p className="text-[14px] text-text-secondary">
                You&apos;ve used all {userPlan.generationsLimit} free AI generations this month.
                Upgrade to Pro for unlimited quiz generation.
              </p>
              <Link href="/pricing">
                <Button size="md">Upgrade to Pro</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {userPlan && userPlan.canGenerate && userPlan.plan === "free" && userPlan.generationsLimit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-page rounded-lg border border-border">
          <div className="flex-1">
            <ProgressBar
              value={Math.round((userPlan.generationsUsed / userPlan.generationsLimit) * 100)}
              size="sm"
              color="primary"
            />
          </div>
          <span className="text-[12px] text-text-muted whitespace-nowrap">
            {userPlan.generationsLimit - userPlan.generationsUsed} of {userPlan.generationsLimit} free left
          </span>
          <Link href="/pricing" className="text-[12px] text-primary font-medium hover:underline whitespace-nowrap">
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Section 1: Details & Categorization ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Details" description="Name and organize your study set for easy discovery." />

        <Card padding="lg">
          <div className="flex flex-col gap-5">
            {certSlug && certName && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-primary/20 rounded-lg">
                <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium text-primary">{certName}</span>
                  <span className="text-[11px] text-text-muted">Auto-tagged for community sharing</span>
                </div>
              </div>
            )}

            <Input
              label="Title"
              placeholder="e.g. Chapter 5 — Network Security"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Category (optional)"
                placeholder="e.g. Networking"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                hint="Helps with library organization"
              />

              {domains && domains.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Exam Domain (optional)
                  </label>
                  <select
                    value={domainTag}
                    onChange={(e) => setDomainTag(e.target.value)}
                    className="h-[38px] px-3 rounded-md border border-border bg-bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary transition-colors duration-150"
                  >
                    <option value="">No domain tag</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-text-muted">
                    Visible when shared to community
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section 2: Source Material ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Source Material" description="Upload a file or paste the content you want to generate questions from." />

        <Card padding="lg">
          <div className="flex flex-col gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileInput}
              className="hidden"
              disabled={fileLoading}
            />

            {uploadedFileName ? (
              <div className="flex items-center gap-4 px-4 py-4 bg-green-50 border border-success/20 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-medium text-text-primary truncate">
                    {uploadedFileName}
                  </span>
                  <span className="text-[12px] text-text-secondary">
                    {uploadedFileSize != null && formatFileSize(uploadedFileSize)}
                    {" \u00b7 "}
                    {content.length.toLocaleString()} characters extracted
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-[13px] text-text-muted hover:text-danger transition-colors shrink-0 px-2 py-1 rounded hover:bg-red-50"
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
                className={`relative flex flex-col items-center justify-center gap-3 py-10 px-6 border-2 border-dashed rounded-lg transition-all ${
                  fileLoading
                    ? "border-primary bg-blue-50/50 cursor-wait"
                    : dragOver
                      ? "border-primary bg-blue-50/50 scale-[1.01]"
                      : "border-border hover:border-primary/40 hover:bg-blue-50/30 bg-bg-surface cursor-pointer"
                }`}
                onClick={() => !fileLoading && fileInputRef.current?.click()}
              >
                {fileLoading ? (
                  <>
                    <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-[14px] text-text-secondary font-medium">
                      Extracting text from file...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[14px] text-text-primary font-medium">
                        <span className="text-primary">Click to upload</span>{" "}or drag and drop
                      </p>
                      <p className="text-[12px] text-text-muted">
                        PDF, DOCX, TXT, MD, CSV, PNG, JPG, WEBP &mdash; up to 10 MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">or paste text</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="flex flex-col gap-1.5">
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
                rows={6}
                className="w-full px-3 py-3 text-[15px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary resize-y"
                style={{ minHeight: "140px" }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-text-muted">
                  {content.length.toLocaleString()} characters
                </p>
                {hasContent && (
                  <span className="flex items-center gap-1 text-[12px] text-success">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Content ready
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section 3: Question Types ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Question Types" description="Choose which formats to include. AI picks the best mix for your content." />

        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-muted">
                {selectedTypes.size === QUESTION_TYPE_OPTIONS.length
                  ? "All types selected"
                  : `${selectedTypes.size} of ${QUESTION_TYPE_OPTIONS.length} selected`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-blue-50 ring-1 ring-primary/20"
                        : "border-border bg-bg-surface hover:border-primary/30 hover:bg-blue-50/30"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-mono font-semibold ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-bg-page text-text-muted border border-border"
                    }`}>
                      {type.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[13px] font-medium ${isSelected ? "text-primary" : "text-text-primary"}`}>
                        {type.label}
                      </span>
                      <span className="text-[11px] text-text-muted">{type.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Card accent="danger" padding="md">
          <p className="text-[14px] text-danger">{error}</p>
        </Card>
      )}

      {/* Generate button */}
      <div className="sticky bottom-0 bg-bg-page border-t border-border -mx-6 px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[13px] text-text-muted">
          {hasTitle && hasContent && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Ready to generate
            </span>
          )}
        </div>
        <Button
          size="lg"
          onClick={generate}
          disabled={!canGenerate}
        >
          Generate Questions
        </Button>
      </div>
    </div>
  );
}
