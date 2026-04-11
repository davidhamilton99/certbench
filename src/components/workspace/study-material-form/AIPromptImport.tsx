"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import { ReviewPhase } from "./ReviewPhase";
import type { QuestionType, GeneratedQuestion } from "./types";
import {
  parseAIOutput,
  buildImportPrompt,
  type ParseResult,
} from "@/lib/study-materials/parse-ai-output";

type Step = "configure" | "paste" | "review";

interface AIPromptImportProps {
  onSave: (questions: GeneratedQuestion[], title: string) => Promise<void>;
  saving: boolean;
  onBack: () => void;
}

export function AIPromptImport({ onSave, saving, onBack }: AIPromptImportProps) {
  const [step, setStep] = useState<Step>("configure");
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(
    new Set(["multiple_choice", "true_false"])
  );
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt = useMemo(
    () => buildImportPrompt([...selectedTypes]),
    [selectedTypes]
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const handleParse = useCallback(() => {
    if (!rawText.trim()) {
      setError("Paste the AI output above first.");
      return;
    }
    if (!title.trim()) {
      setError("Give your study set a title.");
      return;
    }

    const result = parseAIOutput(rawText);
    setParseResult(result);

    if (result.questions.length === 0) {
      setError(
        "No questions could be parsed. Make sure the AI output follows the format shown in the prompt."
      );
      return;
    }

    setError(null);
    setStep("review");
  }, [rawText, title]);

  const handleSave = useCallback(async () => {
    if (!parseResult) return;
    setError(null);
    try {
      await onSave(parseResult.questions as GeneratedQuestion[], title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    }
  }, [parseResult, title, onSave]);

  const removeQuestion = useCallback((index: number) => {
    setParseResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
      };
    });
  }, []);

  // ── Step 1: Configure types + count ────────────────────────────
  if (step === "configure") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-[18px] font-semibold text-text-primary">
            Import from AI
          </h2>
        </div>

        <Card padding="lg">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[14px] text-text-secondary mb-1">
                We&apos;ll generate a prompt for you to copy into any AI (ChatGPT, Claude, Gemini, etc.).
                Paste the result back and we&apos;ll turn it into a study set.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-2">
                Question types
              </label>
              <QuestionTypeSelector
                selectedTypes={selectedTypes}
                onSelectedTypesChange={setSelectedTypes}
              />
            </div>

          </div>
        </Card>

        <Button
          onClick={() => setStep("paste")}
          disabled={selectedTypes.size === 0}
        >
          Generate prompt
        </Button>
      </div>
    );
  }

  // ── Step 2: Copy prompt + paste result ─────────────────────────
  if (step === "paste") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("configure")}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-[18px] font-semibold text-text-primary">
            Import from AI
          </h2>
        </div>

        {/* Step 1: Copy the prompt */}
        <Card padding="lg">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-mono font-semibold text-text-muted uppercase tracking-wider">
                Step 1 — Copy this prompt
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy prompt"}
              </Button>
            </div>
            <pre className="text-[12px] text-text-secondary bg-bg-page border border-border rounded-md p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
              {prompt}
            </pre>
            <p className="text-[12px] text-text-muted">
              Paste this into ChatGPT, Claude, Gemini, or any AI — along with your study material.
            </p>
          </div>
        </Card>

        {/* Step 2: Paste the result */}
        <Card padding="lg">
          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-mono font-semibold text-text-muted uppercase tracking-wider">
              Step 2 — Paste the AI&apos;s response
            </span>
            <div>
              <label
                htmlFor="set-title"
                className="block text-[13px] font-medium text-text-primary mb-1.5"
              >
                Study set title
              </label>
              <input
                id="set-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Security+ Domain 3 — Cryptography"
                className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setError(null);
              }}
              placeholder={"Paste the AI output here...\n\n[MC]\nQ: What port does HTTPS use?\n- 443 (correct)\n- 80\n- 22\n- 8080\nExplanation: HTTPS uses port 443."}
              rows={12}
              className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />

            {/* Live parse count */}
            {rawText.trim() && (
              <p className="text-[12px] text-text-muted">
                {parseAIOutput(rawText).questions.length} question
                {parseAIOutput(rawText).questions.length === 1 ? "" : "s"} detected
              </p>
            )}

            {error && (
              <p className="text-[13px] text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        </Card>

        <Button onClick={handleParse} disabled={!rawText.trim() || !title.trim()}>
          Parse questions
        </Button>
      </div>
    );
  }

  // ── Step 3: Review parsed questions ────────────────────────────
  if (step === "review" && parseResult) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {parseResult.errors.length > 0 && (
          <Card padding="md" accent="warning">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              {parseResult.errors.length} question
              {parseResult.errors.length === 1 ? "" : "s"} couldn&apos;t be parsed:
            </p>
            <ul className="text-[12px] text-text-secondary list-disc pl-4 space-y-0.5">
              {parseResult.errors.map((err, i) => (
                <li key={i}>
                  Line {err.line}: {err.message}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <ReviewPhase
          questions={parseResult.questions as GeneratedQuestion[]}
          title={title}
          contentTruncated={false}
          error={error}
          saving={saving}
          onRemoveQuestion={removeQuestion}
          onBack={() => {
            setStep("paste");
            setParseResult(null);
          }}
          onSave={handleSave}
        />
      </div>
    );
  }

  return null;
}
