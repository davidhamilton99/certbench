"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { createStudySet } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import {
  buildImportPrompt,
  parseAIOutput,
} from "@/core/study-materials/parse-ai-output";
import type { GeneratedQuestion } from "@/core/study-materials/types";
import type { StudyQuestionInput } from "@/core/study-materials/validate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tab = "ai" | "import" | "manual";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi",
  ordering: "Order",
  matching: "Match",
};

export function CreateSetClient({
  plan,
  generationsUsed,
  generationsLimit,
}: {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ai");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // AI tab state
  const [content, setContent] = useState("");
  const [count, setCount] = useState(25);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  // Import tab state
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function save(qs: GeneratedQuestion[], sourcePreview?: string) {
    if (!title.trim()) {
      toast.error("Give the set a title first");
      return;
    }
    if (qs.length === 0) {
      toast.error("No questions to save");
      return;
    }
    setSaving(true);
    try {
      const { setId } = await api(createStudySet, {
        title: title.trim(),
        description: null,
        category: null,
        sourcePreview: sourcePreview ?? null,
        // Server re-validates every question against the shared schemas.
        questions: qs as unknown as StudyQuestionInput[],
      });
      router.push(`/study-materials/${setId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  async function generate() {
    if (!title.trim() || !content.trim()) {
      toast.error("Add a title and paste your study material first");
      return;
    }
    setGenerating(true);
    setQuestions([]);
    setGenStatus("Contacting the generator…");
    try {
      const res = await fetch("/api/study-sets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          questionCount: count,
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Generation failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collected: GeneratedQuestion[] = [];
      const removed = new Set<number>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (!frame.startsWith("data: ")) continue;
          const payload = frame.slice(6);
          if (payload === "[DONE]") continue;
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(payload);
          } catch {
            continue;
          }
          if (msg._type === "error") {
            throw new Error(String(msg.message));
          } else if (msg._type === "validating") {
            setGenStatus(`Reviewing ${msg.count} questions for quality…`);
          } else if (msg._type === "rewrite") {
            const i = Number(msg.index);
            if (collected[i]) collected[i] = msg.question as GeneratedQuestion;
            setQuestions([...collected.filter((_, idx) => !removed.has(idx))]);
          } else if (msg._type === "removed") {
            removed.add(Number(msg.index));
            setQuestions([...collected.filter((_, idx) => !removed.has(idx))]);
          } else if (msg._type === "meta" || msg._type === "validated") {
            // informational
          } else if (msg.question_text) {
            collected.push(msg as unknown as GeneratedQuestion);
            setGenStatus(`Generated ${collected.length} questions…`);
            setQuestions([...collected]);
          }
        }
      }
      setGenStatus(
        `Done — ${collected.length - removed.size} questions ready to review`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
      setGenStatus("");
    } finally {
      setGenerating(false);
    }
  }

  function parseImport() {
    const { questions: parsed, errors } = parseAIOutput(importText);
    setImportErrors(errors.map((e) => `Line ${e.line}: ${e.message}`));
    setQuestions(
      parsed.map((q) => ({ ...q, explanation: q.explanation || undefined }))
    );
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(
      buildImportPrompt([
        "multiple_choice",
        "true_false",
        "multiple_select",
        "ordering",
        "matching",
      ])
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  const quotaText =
    plan === "pro"
      ? "Pro — unlimited generations"
      : `${generationsUsed}/${generationsLimit} free generations used this month`;

  return (
    <div className="grid gap-6">
      <div className="grid max-w-md gap-2">
        <Label htmlFor="setTitle">Set title</Label>
        <Input
          id="setTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. OSI model notes"
          maxLength={120}
        />
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            ["ai", "AI generate"],
            ["import", "Paste from AI"],
            ["manual", "Manual"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setQuestions([]);
              setImportErrors([]);
            }}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              tab === key
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ai" && (
        <div className="grid gap-4">
          <p className="text-xs text-muted-foreground">{quotaText}</p>
          <div className="grid gap-2">
            <Label htmlFor="content">Study material</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your notes, a chapter, transcript — anything text"
              rows={10}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="grid w-28 gap-2">
              <Label htmlFor="count">Questions</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 25)}
              />
            </div>
            <Button onClick={generate} disabled={generating || saving}>
              {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate
            </Button>
            {genStatus && (
              <span className="pb-2 text-xs text-muted-foreground">{genStatus}</span>
            )}
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={copyPrompt}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy the prompt"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Paste it into any AI with your material, then paste the output below.
            </span>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"[MC]\nQ: …\n- correct answer (correct)\n- wrong answer\n…"}
            rows={10}
            className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button onClick={parseImport} className="justify-self-start">
            Parse questions
          </Button>
          {importErrors.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              {importErrors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "manual" && (
        <ManualComposer onAdd={(q) => setQuestions([...questions, q])} />
      )}

      {questions.length > 0 && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {questions.length} question{questions.length === 1 ? "" : "s"} ready
            </h2>
            <Button onClick={() => save(questions, tab === "ai" ? content.slice(0, 500) : undefined)} disabled={saving || generating}>
              {saving && <Loader2 className="animate-spin" />}
              Save set
            </Button>
          </div>
          <div className="grid gap-2">
            {questions.map((q, i) => (
              <Card key={i} className="py-3">
                <CardContent className="flex items-start justify-between gap-3 text-sm">
                  <span className="leading-relaxed">
                    <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {TYPE_LABELS[q.question_type] ?? q.question_type}
                    </span>
                    {q.question_text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Remove question"
                    onClick={() => removeQuestion(i)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimal manual composer: multiple-choice questions only. */
function ManualComposer({ onAdd }: { onAdd: (q: GeneratedQuestion) => void }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState("");

  function add() {
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (!text.trim() || filled.length < 2) {
      toast.error("Question text and at least 2 options are required");
      return;
    }
    if (!options[correct]?.trim()) {
      toast.error("The correct option can't be empty");
      return;
    }
    onAdd({
      question_type: "multiple_choice",
      question_text: text.trim(),
      options: options
        .map((o, i) => ({ text: o.trim(), is_correct: i === correct }))
        .filter((o) => o.text),
      correct_index: options
        .filter((o) => o.trim())
        .findIndex((o) => o.trim() === options[correct].trim()),
      explanation: explanation.trim() || undefined,
    });
    setText("");
    setOptions(["", "", "", ""]);
    setCorrect(0);
    setExplanation("");
  }

  return (
    <div className="grid max-w-xl gap-3">
      <div className="grid gap-2">
        <Label htmlFor="mText">Question</Label>
        <Input
          id="mText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What does DNS resolve?"
        />
      </div>
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name="correct"
            aria-label={`Mark option ${i + 1} correct`}
            checked={correct === i}
            onChange={() => setCorrect(i)}
          />
          <Input
            value={o}
            onChange={(e) =>
              setOptions(options.map((x, xi) => (xi === i ? e.target.value : x)))
            }
            placeholder={`Option ${i + 1}${correct === i ? " (correct)" : ""}`}
          />
        </div>
      ))}
      <div className="grid gap-2">
        <Label htmlFor="mExp">Explanation (optional)</Label>
        <Input
          id="mExp"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>
      <Button onClick={add} variant="secondary" className="justify-self-start">
        Add question
      </Button>
    </div>
  );
}
