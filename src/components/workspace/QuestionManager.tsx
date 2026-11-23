"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  deleteStudyQuestion,
  upsertStudyQuestion,
  type StudyQuestion,
} from "@/contracts/study-sets";
import { userMessage } from "@/lib/errors/user-message";
import type { StudyQuestionInput } from "@/core/study-materials/validate";
import type { MCTFOption } from "@/core/study-materials/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  multiple_select: "Multiple answers",
  ordering: "Ordering",
  matching: "Matching",
};

/**
 * For the owner of a study set: correct a question's wording or its answers,
 * or delete a question. It is folded away under the player until it is opened.
 *
 * A question cannot be made again once it is deleted, so deleting asks first.
 */
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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listId = useId();

  async function remove(questionId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api(deleteStudyQuestion, { setId, questionId });
      toast.success("The question has been deleted.");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      setDeleting(null);
      toast.error(userMessage(err, "The question could not be deleted. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen(!open)}
        className="cb-tap flex items-center gap-1.5 rounded-md text-small font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        Edit the questions ({questions.length})
      </button>

      {open && (
        <ol id={listId} className="mt-3 grid gap-2">
          {questions.map((q, i) => (
            <li key={q.id} className="glass grid gap-2 rounded-lg px-4 py-3 text-small">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="mr-1.5 text-note tabular-nums text-muted-foreground">{i + 1}.</span>
                  {q.question_text}
                  <span className="block text-note text-muted-foreground">
                    {TYPE_LABELS[q.question_type] ?? q.question_type}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit question ${i + 1}`}
                    aria-expanded={editing === q.id}
                    onClick={() => setEditing(editing === q.id ? null : q.id)}
                  >
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete question ${i + 1}`}
                    onClick={() => setDeleting(q.id)}
                  >
                    <Trash2 aria-hidden className="size-4" />
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
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this question?"
        message="The question will be removed from the study set permanently. This cannot be undone."
        confirmLabel="Delete the question"
        cancelLabel="Keep the question"
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/**
 * The form that opens under a question: its text and its explanation for
 * every type, the text of each answer, and which answer is correct for
 * multiple choice and true or false. The answers of the other types keep
 * their structure: to change it, delete the question.
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
  const [error, setError] = useState("");
  const errorId = useId();

  function optionLabel(o: Record<string, unknown>, key: string): string {
    return String(o[key] ?? "");
  }

  function setOptionField(i: number, key: string, value: string) {
    setOptions(options.map((o, oi) => (oi === i ? { ...o, [key]: value } : o)));
  }

  function setCorrect(i: number) {
    setOptions(options.map((o, oi) => ({ ...o, is_correct: oi === i })));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || !text.trim()) return;
    setSaving(true);
    setError("");
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
      toast.success("The question has been updated.");
      onSaved();
    } catch (err) {
      setError(userMessage(err, "The question could not be saved. Please try again."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 border-t border-border pt-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`qt-${question.id}`}>Question</Label>
        <Input id={`qt-${question.id}`} value={text} onChange={(e) => setText(e.target.value)} required />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          {isMcTf ? "Answers. Choose the one that is correct." : "Answers"}
        </legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            {isMcTf && (
              // The label is the radio button's hit area: 44 pixels on a touch screen.
              <label className="cb-tap flex shrink-0 items-center">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  aria-label={`Answer ${i + 1} is the correct answer`}
                  checked={Boolean(o.is_correct)}
                  onChange={() => setCorrect(i)}
                  className="size-4 accent-primary"
                />
              </label>
            )}
            {"left" in o ? (
              <>
                <Input
                  value={optionLabel(o, "left")}
                  onChange={(e) => setOptionField(i, "left", e.target.value)}
                  aria-label={`Pair ${i + 1}, term`}
                />
                <Input
                  value={optionLabel(o, "right")}
                  onChange={(e) => setOptionField(i, "right", e.target.value)}
                  aria-label={`Pair ${i + 1}, definition`}
                />
              </>
            ) : (
              <Input
                value={optionLabel(o, "text")}
                onChange={(e) => setOptionField(i, "text", e.target.value)}
                aria-label={`Answer ${i + 1}`}
              />
            )}
          </div>
        ))}
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor={`qe-${question.id}`}>Explanation</Label>
        <Input id={`qe-${question.id}`} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </div>

      <div className="grid justify-items-start gap-2">
        <Button
          type="submit"
          size="sm"
          loading={saving}
          disabled={!text.trim()}
          aria-describedby={error ? errorId : undefined}
        >
          Save the changes
        </Button>
        {error && (
          <p id={errorId} role="alert" className="text-small text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
