"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  deleteStudyQuestion,
  upsertStudyQuestion,
  type StudyQuestion,
} from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import type { StudyQuestionInput } from "@/core/study-materials/validate";
import type { MCTFOption } from "@/core/study-materials/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi",
  ordering: "Order",
  matching: "Match",
};

/** Owner-only editor: fix typos, adjust answers, delete questions. */
export function QuestionManager({
  setId,
  questions,
}: {
  setId: string;
  questions: StudyQuestion[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(questionId: string) {
    setBusy(questionId);
    try {
      await api(deleteStudyQuestion, { setId, questionId });
      toast.success("Question deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        Manage questions ({questions.length})
      </button>

      {open && (
        <div className="mt-3 grid gap-2">
          {questions.map((q) => (
            <Card key={q.id} className="py-3">
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="leading-relaxed">
                    <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {TYPE_LABELS[q.question_type] ?? q.question_type}
                    </span>
                    {q.question_text}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Edit question"
                      onClick={() => setEditing(editing === q.id ? null : q.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Delete question"
                      disabled={busy === q.id}
                      onClick={() => remove(q.id)}
                    >
                      {busy === q.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </span>
                </div>
                {editing === q.id && (
                  <EditForm
                    setId={setId}
                    question={q}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline edit: question text + explanation for every type; option text for
 * all types; correct-answer switching for MC/TF (structural edits to
 * multi-select/ordering/matching answers are out of scope — delete and
 * recreate for those).
 */
function EditForm({
  setId,
  question,
  onSaved,
}: {
  setId: string;
  question: StudyQuestion;
  onSaved: () => void;
}) {
  const isMcTf =
    question.question_type === "multiple_choice" ||
    question.question_type === "true_false";
  const [text, setText] = useState(question.question_text);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [options, setOptions] = useState(() =>
    JSON.parse(JSON.stringify(question.options)) as Record<string, unknown>[]
  );
  const [saving, setSaving] = useState(false);

  function optionLabel(o: Record<string, unknown>, key: string): string {
    return String(o[key] ?? "");
  }

  function setOptionField(i: number, key: string, value: string) {
    setOptions(options.map((o, oi) => (oi === i ? { ...o, [key]: value } : o)));
  }

  function setCorrect(i: number) {
    setOptions(options.map((o, oi) => ({ ...o, is_correct: oi === i })));
  }

  async function save() {
    setSaving(true);
    try {
      const correctIndex = isMcTf
        ? (options as unknown as MCTFOption[]).findIndex((o) => o.is_correct)
        : question.correct_index;
      await api(upsertStudyQuestion, {
        setId,
        questionId: question.id,
        question: {
          question_type: question.question_type,
          question_text: text.trim(),
          options,
          correct_index: correctIndex,
          explanation: explanation.trim() || null,
        } as unknown as StudyQuestionInput,
      });
      toast.success("Question updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 border-t pt-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`qt-${question.id}`}>Question</Label>
        <Input
          id={`qt-${question.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {isMcTf && (
            <input
              type="radio"
              name={`correct-${question.id}`}
              aria-label={`Mark option ${i + 1} correct`}
              checked={Boolean(o.is_correct)}
              onChange={() => setCorrect(i)}
            />
          )}
          {"left" in o ? (
            <>
              <Input
                value={optionLabel(o, "left")}
                onChange={(e) => setOptionField(i, "left", e.target.value)}
                aria-label={`Pair ${i + 1} term`}
              />
              <Input
                value={optionLabel(o, "right")}
                onChange={(e) => setOptionField(i, "right", e.target.value)}
                aria-label={`Pair ${i + 1} definition`}
              />
            </>
          ) : (
            <Input
              value={optionLabel(o, "text")}
              onChange={(e) => setOptionField(i, "text", e.target.value)}
              aria-label={`Option ${i + 1}`}
            />
          )}
        </div>
      ))}

      <div className="grid gap-1.5">
        <Label htmlFor={`qe-${question.id}`}>Explanation</Label>
        <Input
          id={`qe-${question.id}`}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      <Button onClick={save} disabled={saving || !text.trim()} className="justify-self-start" size="sm">
        {saving && <Loader2 className="animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}
