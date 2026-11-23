"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { submitTestimonial } from "@/contracts/testimonials";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CertOption {
  certId: string;
  certName: string;
}

/** The shortest and longest story the server accepts (src/contracts/testimonials.ts). */
const STORY_MIN = 10;
const STORY_MAX = 600;

/**
 * "How did your exam go?", reached from the email sent after a member's exam
 * date. A member who passed can write a short story for publication; one who
 * did not is pointed back to the study plan. Nothing is sent until the story
 * is submitted.
 *
 * The question is a pair of radio buttons in a group named by the question.
 * Every field has a visible label, the rules are said before they are broken,
 * and an error is said beside the button and tied to the field.
 */
export function FeedbackClient({
  options,
  defaultDisplayName,
  initialPassed,
}: {
  options: CertOption[];
  defaultDisplayName: string;
  initialPassed: boolean | null;
}) {
  const [passed, setPassed] = useState<boolean | null>(initialPassed);
  const [certId, setCertId] = useState<string>(options[0]?.certId ?? "");
  const [quote, setQuote] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const storyHintId = useId();
  const nameHintId = useId();
  const errorId = useId();

  // The form is replaced by its confirmation: the focus goes to the
  // confirmation's heading, so that it is read and the keyboard keeps its place.
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const tooShort = quote.trim().length < STORY_MIN;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (tooShort) {
      setError(`Please write at least ${STORY_MIN} characters.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(submitTestimonial, {
        certId: certId || null,
        passed: true,
        quote: quote.trim(),
        displayName: displayName.trim() || "A CertBench user",
      });
      setDone(true);
    } catch (err) {
      setError(userMessage(err, "Your story could not be sent. Please try again."));
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="glass grid gap-3 rounded-lg p-5 sm:p-8">
        <h2 ref={doneRef} tabIndex={-1} className="cb-statement">
          Thank you. Your story has been received.
        </h2>
        <p className="cb-measure text-small text-muted-foreground">
          Each story is reviewed before it is published. Congratulations on passing your exam.
        </p>
        <Button asChild className="justify-self-start">
          <Link href="/dashboard">Return to your study plan</Link>
        </Button>
      </div>
    );
  }

  const field =
    "rounded-md border border-input bg-card px-3 text-base focus-visible:border-ring md:text-small dark:[color-scheme:dark]";

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-small font-medium">Did you pass your exam?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["I passed", true],
              ["I did not pass", false],
            ] as const
          ).map(([label, value]) => (
            <label
              key={label}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-small font-medium transition-colors",
                passed === value ? "border-primary bg-tint-selected" : "border-input hover:border-primary hover:bg-tint-hover"
              )}
            >
              <input
                type="radio"
                name="passed"
                checked={passed === value}
                onChange={() => {
                  setPassed(value);
                  setError("");
                }}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {passed === true && (
        <form onSubmit={submit} noValidate className="glass grid gap-4 rounded-lg p-5 sm:p-6">
          <p className="cb-measure text-small">
            Congratulations on passing your exam. If you wish, write a few sentences about how you prepared.
          </p>

          {options.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="fb-cert">Exam</Label>
              <select
                id="fb-cert"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                className={cn(field, "h-10 max-w-sm pointer-coarse:h-11")}
              >
                {options.map((o) => (
                  <option key={o.certId} value={o.certId}>
                    {o.certName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="fb-quote">Your story</Label>
            <p id={storyHintId} className="cb-measure text-note text-muted-foreground">
              Write between {STORY_MIN} and {STORY_MAX} characters. After it has been reviewed, your story may be
              published on CertBench with the name that you give below.
            </p>
            <textarea
              id="fb-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={5}
              maxLength={STORY_MAX}
              aria-describedby={error ? `${storyHintId} ${errorId}` : storyHintId}
              aria-invalid={error ? true : undefined}
              className={cn(field, "py-2 aria-invalid:border-destructive")}
            />
            <p className="text-note tabular-nums text-muted-foreground">
              {quote.length} of {STORY_MAX} characters
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fb-name">Name to publish</Label>
            <p id={nameHintId} className="text-note text-muted-foreground">
              For example, your first name and the first letter of your last name.
            </p>
            <Input
              id="fb-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              autoComplete="off"
              aria-describedby={nameHintId}
              className="max-w-sm"
            />
          </div>

          <div className="grid justify-items-start gap-2">
            <Button type="submit" loading={saving}>
              Send my story
            </Button>
            {error && (
              <p id={errorId} role="alert" className="text-small text-destructive">
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      {passed === false && (
        <div className="glass grid gap-3 rounded-lg p-5 sm:p-6">
          <p className="cb-measure text-small">
            Your progress is saved. Your study plan shows your score in each domain, and the questions that you
            answered incorrectly are listed under Review.
          </p>
          <Button asChild className="justify-self-start">
            <Link href="/dashboard">Return to your study plan</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
