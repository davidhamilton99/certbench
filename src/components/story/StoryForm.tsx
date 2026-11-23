"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { userMessage } from "@/lib/errors/user-message";
import { submitStory } from "@/contracts/client";
import { ApiError } from "@/contracts/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "ask" | "story" | "regroup" | "thanks" | "already";

/** The shortest comment that is stored (the same limit as the endpoint's). */
const MIN_COMMENT = 10;
const MAX_COMMENT = 600;

/** Shown when the answer could not be sent and the endpoint gave no more exact reason. */
const NOT_SENT = "Your answer could not be sent. Please try again.";

/** One of the two answers: a plain pressable row, as an answer to a question is. */
const choice =
  "grid gap-1.5 rounded-md border border-input bg-card p-5 text-left transition-[border-color,background-color] duration-100 hover:border-primary hover:bg-tint-hover active:bg-tint-press sm:p-6";

/**
 * How an exam went, answered from the post-exam email in two presses and a
 * sentence. A pass becomes a comment for the home page, once it has been
 * reviewed. A candidate who did not pass is taken back to the study path,
 * where preparing for the next attempt starts.
 */
export function StoryForm({
  token,
  certName,
  pathHref,
  defaultName,
  preset,
}: {
  token: string;
  certName: string;
  /** Their exam's path, or /start when the exam has none. */
  pathHref: string;
  /** First name and last initial, from their profile. */
  defaultName: string;
  /** From the email button they pressed. */
  preset: boolean | null;
}) {
  const [step, setStep] = useState<Step>(preset === true ? "story" : preset === false ? "regroup" : "ask");
  const [quote, setQuote] = useState("");
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const quoteId = `${id}-quote`;
  const nameId = `${id}-name`;
  const errorId = `${id}-error`;

  useEffect(() => {
    track("story_viewed", { preset: preset === true ? "pass" : preset === false ? "fail" : "none" });
  }, [preset]);

  // Each press replaces the screen, and the button that had the focus goes
  // with it. The new screen's heading takes the focus, so a screen reader
  // reads it and the keyboard continues from there. Not on the first screen:
  // a page does not take the focus as it loads.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    headingRef.current?.focus();
  }, [step]);

  function pick(passed: boolean) {
    track("story_answer_picked", { passed });
    setError("");
    setStep(passed ? "story" : "regroup");
  }

  async function send(passed: boolean) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await api(submitStory, { token, passed, quote, displayName: name.trim() || defaultName });
      if (passed) setStep("thanks");
      else window.location.assign(pathHref);
    } catch (err) {
      // An answer was sent from this link already: that is a yes, not an error.
      // For a pass, the server replaces an earlier comment that did not pass or
      // is waiting for review, so a conflict means that a pass comment from
      // this account was already reviewed: nothing new was stored, and the
      // screen says so instead of promising a review.
      if (err instanceof ApiError && err.code === "conflict") {
        if (passed) setStep("already");
        else window.location.assign(pathHref);
        return;
      }
      setError(userMessage(err, NOT_SENT));
    } finally {
      setSaving(false);
    }
  }

  if (step === "ask") {
    return (
      <div className="grid gap-8">
        <Header
          headingRef={headingRef}
          eyebrow={certName}
          title="How did your exam go?"
          sub="The date of your exam has passed. Please let us know the result."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => pick(true)} className={choice}>
            <span className="text-lede font-semibold">I passed</span>
            <span className="text-small text-muted-foreground">Tell other candidates what helped you.</span>
          </button>
          <button type="button" onClick={() => pick(false)} className={choice}>
            <span className="text-lede font-semibold">I did not pass</span>
            <span className="text-small text-muted-foreground">Continue from where you stopped.</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === "thanks" || step === "already") {
    return (
      <div className="grid justify-items-center gap-6 text-center">
        <Header
          headingRef={headingRef}
          center
          title="Thank you."
          sub={
            step === "thanks"
              ? "Your comment helps other candidates to begin. It will be reviewed before it is published on CertBench."
              : "A comment about this exam was already received from your account, so this one was not stored."
          }
        />
        <Button asChild size="lg">
          <Link href="/">Return to the home page</Link>
        </Button>
      </div>
    );
  }

  const passed = step === "story";
  const written = quote.trim().length;
  const tooShort = passed && written < MIN_COMMENT;
  return (
    <form
      className="grid gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (tooShort) return;
        void send(passed);
      }}
    >
      {passed ? (
        <Header
          headingRef={headingRef}
          eyebrow={certName}
          title="Congratulations."
          sub="What helped you to pass? One or two sentences are enough."
        />
      ) : (
        <Header
          headingRef={headingRef}
          eyebrow={certName}
          title="You can take the exam again."
          sub="Your study path continues from where you stopped."
        />
      )}

      <div className="glass grid gap-5 rounded-lg p-5 sm:p-7">
        <div className="grid gap-2">
          <Label htmlFor={quoteId}>{passed ? "What helped you" : "What you found difficult (optional)"}</Label>
          <textarea
            id={quoteId}
            value={quote}
            onChange={(e) => setQuote(e.target.value.slice(0, MAX_COMMENT))}
            rows={4}
            required={passed}
            minLength={passed ? MIN_COMMENT : undefined}
            aria-describedby={error ? `${quoteId}-hint ${errorId}` : `${quoteId}-hint`}
            className="w-full resize-none rounded-md border border-input bg-card px-3 py-2.5 text-base transition-colors focus-visible:border-ring md:text-small"
          />
          <p id={`${quoteId}-hint`} className="text-note text-muted-foreground">
            {passed && <>Please write at least {MIN_COMMENT} characters. </>}
            You have used {quote.length} of {MAX_COMMENT} characters.
          </p>
        </div>
        {passed && (
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Name to show</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              maxLength={60}
              autoComplete="name"
              aria-describedby={`${nameId}-hint`}
            />
            <p id={`${nameId}-hint`} className="text-note text-muted-foreground">
              This name is shown with your comment if it is published.
            </p>
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-small text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button type="submit" size="lg" loading={saving} disabled={tooShort}>
            {passed ? "Send my comment" : written > 0 ? "Send and go to the study path" : "Go to the study path"}
          </Button>
          <button type="button" onClick={() => setStep("ask")} className="cb-link cb-tap text-small">
            Change my answer
          </button>
        </div>
      </div>
    </form>
  );
}

function Header({
  eyebrow,
  title,
  sub,
  center = false,
  headingRef,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  center?: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className={cn("grid gap-3", center ? "justify-items-center text-center" : "text-left")}>
      {eyebrow && <p className="cb-label text-muted-foreground">{eyebrow}</p>}
      <h1 ref={headingRef} tabIndex={-1} className="cb-title">
        {title}
      </h1>
      <p className="cb-measure-xs text-lede text-muted-foreground">{sub}</p>
    </div>
  );
}
