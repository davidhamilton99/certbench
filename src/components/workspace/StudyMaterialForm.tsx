"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FileUploadZone } from "./study-material-form/FileUploadZone";
import { GenerationProgress } from "./study-material-form/GenerationProgress";
import { QuestionTypeSelector } from "./study-material-form/QuestionTypeSelector";
import { ReviewPhase } from "./study-material-form/ReviewPhase";
import { AIPromptImport } from "./study-material-form/AIPromptImport";
import type {
  QuestionType,
  GeneratedQuestion,
  Phase,
  UserPlan,
} from "./study-material-form/types";
import {
  QUESTION_TYPE_OPTIONS,
} from "./study-material-form/types";

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

interface CertOption {
  slug: string;
  name: string;
}

export function StudyMaterialForm({
  certOptions,
  domainsByCert,
}: {
  certOptions?: CertOption[];
  domainsByCert?: Record<string, string[]>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"generate" | "import">("generate");
  const [phase, setPhase] = useState<Phase>("form");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [sourcePreview, setSourcePreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCertSlug, setSelectedCertSlug] = useState(
    certOptions && certOptions.length === 1 ? certOptions[0].slug : ""
  );
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

  const clearFile = useCallback(() => {
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setContent("");
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
    if (saving) return;
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
          certSlug: selectedCertSlug || undefined,
          domainTag: domainTag || undefined,
        }),
      });

      const data = await res.json() as { id?: string; error?: string; details?: string[] };

      if (!res.ok) {
        const detail = data.details?.length ? `: ${data.details.join(", ")}` : "";
        setError((data.error || "Failed to save study set") + detail);
        return;
      }

      router.refresh();
      router.push(`/study-materials/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, questions, title, category, sourcePreview, selectedCertSlug, domainTag, router]);

  const handleImportSave = useCallback(
    async (importedQuestions: GeneratedQuestion[], importTitle: string) => {
      setSaving(true);
      try {
        const res = await fetch("/api/study-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: importTitle,
            questions: importedQuestions,
          }),
        });
        const data = await res.json() as { id?: string; error?: string; details?: string[] };
        if (!res.ok) {
          const detail = data.details?.length ? `: ${data.details.join(", ")}` : "";
          throw new Error((data.error || "Failed to save study set") + detail);
        }
        router.refresh();
        router.push(`/study-materials/${data.id}`);
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  // ─── Import mode ──────────────────────────────────────────────
  if (mode === "import") {
    return (
      <AIPromptImport
        onSave={handleImportSave}
        saving={saving}
        onBack={() => setMode("generate")}
      />
    );
  }

  const currentStep = phase === "form" ? 1 : phase === "review" ? 3 : 2;

  // ─── Generating / validating state ─────────────────────────────
  if (phase === "generating" || phase === "validating") {
    return (
      <div className="flex flex-col gap-8 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Create Study Material
          </h1>
          <StepIndicator currentStep={currentStep} />
        </div>

        <GenerationProgress
          phase={phase}
          questionCount={questions.length}
        />
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

        <ReviewPhase
          questions={questions}
          title={title}
          contentTruncated={contentTruncated}
          error={error}
          saving={saving}
          onRemoveQuestion={removeQuestion}
          onBack={() => setPhase("form")}
          onSave={saveToLibrary}
        />
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

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-bg-page border border-border rounded-lg">
        <button
          onClick={() => setMode("generate")}
          className="flex-1 py-2 px-3 rounded-md text-[13px] font-medium transition-colors bg-bg-surface text-text-primary shadow-sm"
        >
          Generate with AI
        </button>
        <button
          onClick={() => setMode("import")}
          className="flex-1 py-2 px-3 rounded-md text-[13px] font-medium transition-colors text-text-muted hover:text-text-secondary"
        >
          Import from AI
        </button>
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

              {certOptions && certOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Certification
                  </label>
                  <select
                    value={selectedCertSlug}
                    onChange={(e) => {
                      setSelectedCertSlug(e.target.value);
                      setDomainTag("");
                    }}
                    className="h-[38px] px-3 rounded-md border border-border bg-bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary transition-colors duration-150"
                  >
                    <option value="">No certification</option>
                    {certOptions.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-text-muted">
                    Tags this set for community sharing
                  </p>
                </div>
              )}

              {selectedCertSlug && domainsByCert && domainsByCert[selectedCertSlug] && domainsByCert[selectedCertSlug].length > 0 && (
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
                    {domainsByCert[selectedCertSlug].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-text-muted">
                    Narrows down the exam topic area
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

        <FileUploadZone
          content={content}
          uploadedFileName={uploadedFileName}
          uploadedFileSize={uploadedFileSize}
          dragOver={dragOver}
          fileLoading={fileLoading}
          onContentChange={(newContent) => {
            setContent(newContent);
            if (uploadedFileName) {
              setUploadedFileName(null);
              setUploadedFileSize(null);
            }
          }}
          onFileUploaded={(name, size, extractedContent) => {
            setUploadedFileName(name);
            setUploadedFileSize(size);
            setContent(extractedContent);
          }}
          onClearFile={clearFile}
          onDragOverChange={setDragOver}
          onFileLoadingChange={setFileLoading}
          onError={setError}
          autoFillTitle={autoFillTitle}
        />
      </div>

      {/* ── Section 3: Question Types ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Question Types" description="Choose which formats to include. AI picks the best mix for your content." />

        <QuestionTypeSelector
          selectedTypes={selectedTypes}
          onSelectedTypesChange={setSelectedTypes}
        />
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
