"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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

export function FlashcardImportForm({
  certSlug,
}: {
  certSlug?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [error, setError] = useState("");

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
          certSlug,
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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/study-materials"
          className="text-[13px] text-text-muted hover:text-text-primary transition-colors"
        >
          Study Materials
        </Link>
        <span className="text-[13px] text-text-muted">/</span>
        <span className="text-[13px] text-text-primary">Import Flashcards</span>
      </div>

      <h1 className="text-[24px] font-bold text-text-primary tracking-tight mb-2">
        Import Flashcards
      </h1>
      <p className="text-[15px] text-text-secondary mb-6">
        Paste tab-separated question and answer pairs. We&apos;ll generate multiple choice options automatically.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Phase: Input */}
      {phase === "input" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Security+ Chapter 4 Review"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">
              Flashcards
            </label>
            <p className="text-[12px] text-text-muted mb-2">
              One per line. Separate question and answer with a <strong>tab</strong>.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`What port does HTTPS use?\t443\nWhat does CIA stand for?\tConfidentiality, Integrity, Availability\nWhat layer does a firewall operate at?\tLayer 3 and Layer 4\nWhat is the purpose of a DMZ?\tTo isolate public-facing services from the internal network`}
              rows={12}
              className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono resize-y"
            />
            <p className="text-[12px] text-text-muted mt-1.5">
              Minimum 4 pairs. You can copy directly from a spreadsheet — the tab character is preserved.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={parseInput} disabled={!rawText.trim()}>
              Parse & Preview
            </Button>
            <Link href="/study-materials">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Phase: Preview parsed cards */}
      {phase === "preview" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <p className="text-[14px] text-text-secondary">
            Found <strong>{parsedCards.length}</strong> flashcards. Review them below, then generate multiple choice questions.
          </p>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {parsedCards.map((card, i) => (
              <Card key={i} padding="sm">
                <div className="flex gap-4">
                  <span className="text-[12px] text-text-muted font-mono shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary">
                      {card.question}
                    </p>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      {card.answer}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={generateQuestions}>
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
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-text-secondary">
            Generating multiple choice options for {parsedCards.length} questions...
          </p>
        </div>
      )}

      {/* Phase: Review generated MC questions */}
      {phase === "review" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <p className="text-[14px] text-text-secondary">
            <strong>{questions.length}</strong> multiple choice questions generated. Review and save.
          </p>

          {!title.trim() && (
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Security+ Chapter 4 Review"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
            {questions.map((q, i) => (
              <Card key={i} padding="md">
                <p className="text-[13px] font-medium text-text-primary mb-2">
                  <span className="text-text-muted font-mono mr-2">{i + 1}.</span>
                  {q.question_text}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`px-3 py-1.5 rounded text-[13px] ${
                        opt.is_correct
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-bg-page text-text-secondary"
                      }`}
                    >
                      {opt.text}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-[12px] text-text-muted mt-2 italic">
                    {q.explanation}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveStudySet} disabled={!title.trim()}>
              Save Study Set
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("input");
                setError("");
              }}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Saving */}
      {phase === "saving" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-text-secondary">Saving study set...</p>
        </div>
      )}
    </div>
  );
}
