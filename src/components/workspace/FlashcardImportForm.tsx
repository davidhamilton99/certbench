"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ParsedCard {
  question: string;
  answer: string;
}

interface MCOption {
  text: string;
  is_correct: boolean;
}

interface MCQuestion {
  question_type: "multiple_choice";
  question_text: string;
  options: MCOption[];
  correct_index: number;
  explanation: string;
}

type Phase = "input" | "preview" | "generating" | "review" | "saving";

const STEPS = [
  { number: 1, label: "Paste" },
  { number: 2, label: "Preview" },
  { number: 3, label: "Save" },
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

interface CertOption {
  slug: string;
  name: string;
}

export function FlashcardImportForm({
  certOptions,
}: {
  certOptions?: CertOption[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [selectedCertSlug, setSelectedCertSlug] = useState(
    certOptions && certOptions.length === 1 ? certOptions[0].slug : ""
  );
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [error, setError] = useState("");

  const currentStep = phase === "input" ? 1 : phase === "preview" || phase === "generating" ? 2 : 3;

  const parseInput = () => {
    setError("");
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 4) {
      setError("Please enter at least 4 question-answer pairs (needed for multiple choice).");
      return;
    }

    const cards: ParsedCard[] = [];
    const failedLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        cards.push({
          question: parts[0].trim(),
          answer: parts[1].trim(),
        });
      } else {
        failedLines.push(i + 1);
      }
    }

    if (cards.length < 4) {
      setError(
        `Only ${cards.length} valid pairs found. Need at least 4.${
          failedLines.length > 0
            ? ` Lines without tabs: ${failedLines.slice(0, 5).join(", ")}${failedLines.length > 5 ? "..." : ""}`
            : ""
        }`
      );
      return;
    }

    if (cards.length > 200) {
      setError("Maximum 200 flashcards per import.");
      return;
    }

    setParsedCards(cards);
    setPhase("preview");
  };

  const generateQuestions = async () => {
    setPhase("generating");
    setError("");

    try {
      const res = await fetch("/api/study-materials/import-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcards: parsedCards }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate questions");
      }

      const data = await res.json();
      setQuestions(data.questions);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("preview");
    }
  };

  const saveStudySet = async () => {
    if (phase === "saving") return;
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setPhase("saving");
    setError("");

    try {
      const res = await fetch("/api/study-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: "Imported Flashcards",
          questions,
          certSlug: selectedCertSlug || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      router.push(`/study-materials/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("review");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/study-materials"
              className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
            >
              Study Materials
            </Link>
            <span className="text-[13px] text-border">/</span>
            <span className="text-[13px] text-text-primary font-medium">Import</span>
          </div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Import Flashcards
          </h1>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Paste tab-separated pairs and AI will generate multiple choice options.
          </p>
        </div>
        <StepIndicator currentStep={currentStep} />
      </div>

      {error && (
        <Card accent="danger" padding="md">
          <p className="text-[13px] text-danger">{error}</p>
        </Card>
      )}

      {/* Phase: Input */}
      {phase === "input" && (
        <div className="flex flex-col gap-5">
          <Card padding="lg">
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Security+ Chapter 4 Review"
                />

                {certOptions && certOptions.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-text-primary">
                      Certification
                    </label>
                    <select
                      value={selectedCertSlug}
                      onChange={(e) => setSelectedCertSlug(e.target.value)}
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
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Flashcards
                </label>
                <p className="text-[12px] text-text-muted">
                  One per line. Separate question and answer with a <strong>tab</strong> character.
                  You can copy directly from a spreadsheet.
                </p>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`What port does HTTPS use?\t443\nWhat does CIA stand for?\tConfidentiality, Integrity, Availability\nWhat layer does a firewall operate at?\tLayer 3 and Layer 4\nWhat is the purpose of a DMZ?\tTo isolate public-facing services`}
                  rows={12}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-3 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary font-mono resize-y transition-colors duration-150"
                  style={{ minHeight: "200px" }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-text-muted">
                    Minimum 4 pairs, maximum 200
                  </p>
                  {rawText.trim() && (
                    <span className="text-[12px] text-text-muted font-mono tabular-nums">
                      {rawText.split("\n").filter(l => l.trim()).length} lines
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={parseInput} disabled={!rawText.trim()} size="lg">
              Parse &amp; Preview
            </Button>
            <Link href="/study-materials">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Phase: Preview parsed cards */}
      {phase === "preview" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-bg-page border border-border rounded-lg">
            <Badge variant="success">{parsedCards.length} cards</Badge>
            <span className="text-[13px] text-text-secondary">
              parsed successfully. Review below, then generate MC questions.
            </span>
          </div>

          <Card padding="md">
            <div className="flex flex-col divide-y divide-border max-h-80 overflow-y-auto">
              {parsedCards.map((card, i) => (
                <div key={i} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-[11px] text-text-muted font-mono shrink-0 mt-0.5 w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary leading-snug">
                      {card.question}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      {card.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={generateQuestions} size="lg">
              Generate Multiple Choice
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("input");
                setError("");
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Generating */}
      {phase === "generating" && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 animate-spin-slow" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="var(--color-primary)" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28 * 0.25} ${2 * Math.PI * 28 * 0.75}`}
                  className="animate-spin"
                  style={{ transformOrigin: "center" }}
                />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[15px] font-medium text-text-primary">
                Generating multiple choice options
              </p>
              <p className="text-[13px] text-text-secondary">
                Converting {parsedCards.length} flashcards into practice questions...
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Phase: Review generated MC questions */}
      {phase === "review" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-bg-page border border-border rounded-lg">
            <Badge variant="success">{questions.length} questions</Badge>
            <span className="text-[13px] text-text-secondary">
              generated. Review and save to your library.
            </span>
          </div>

          {!title.trim() && (
            <Card padding="lg">
              <Input
                label="Title (required)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Security+ Chapter 4 Review"
              />
            </Card>
          )}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
            {questions.map((q, i) => (
              <Card key={i} padding="md">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-page border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-text-muted mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[14px] font-medium text-text-primary leading-snug">
                      {q.question_text}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-9">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-[13px] ${
                          opt.is_correct
                            ? "bg-green-50 text-success border border-success/20"
                            : "bg-bg-page text-text-secondary"
                        }`}
                      >
                        <span className="font-mono text-[11px]">{String.fromCharCode(65 + oi)})</span>
                        <span className={opt.is_correct ? "font-medium" : ""}>{opt.text}</span>
                        {opt.is_correct && (
                          <svg className="w-3.5 h-3.5 text-success shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
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

          <div className="sticky bottom-0 bg-bg-page border-t border-border -mx-6 px-6 py-4 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("input");
                setError("");
              }}
            >
              Start Over
            </Button>
            <Button onClick={saveStudySet} disabled={!title.trim()} size="lg">
              Save to Library
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Saving */}
      {phase === "saving" && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-text-secondary">Saving study set...</p>
          </div>
        </Card>
      )}
    </div>
  );
}
