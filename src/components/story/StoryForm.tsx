"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { submitStory } from "@/contracts/story";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Step = "ask" | "story" | "regroup" | "thanks";

const tile =
  "glass group grid gap-2 rounded-2xl p-5 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_24px_60px_-30px_var(--primary)] sm:p-6";

/**
 * How an exam went, answered from the post-exam email in two taps and a
 * sentence. A pass becomes a story for the homepage (after review); a miss
 * gets pointed back at the path, where retakes start.
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

  useEffect(() => {
    track("story_viewed", { preset: preset === true ? "pass" : preset === false ? "fail" : "none" });
  }, [preset]);

  function pick(passed: boolean) {
    track("story_answer_picked", { passed });
    setError("");
    setStep(passed ? "story" : "regroup");
  }

  async function send(passed: boolean) {
    setSaving(true);
    setError("");
    try {
      await api(submitStory, { token, passed, quote, displayName: name.trim() || defaultName });
      if (passed) setStep("thanks");
      else window.location.assign(pathHref);
    } catch (err) {
      // Sent once already from this link: that's a yes, not an error.
      if (err instanceof ApiError && err.code === "conflict") {
        if (passed) setStep("thanks");
        else window.location.assign(pathHref);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (step === "ask") {
    return (
      <div className="grid gap-8">
        <Header eyebrow={certName} title="How did it go?" sub="Your exam date has passed. One tap tells us." />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => pick(true)} className={tile}>
            <span className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <span className="text-xl font-semibold tracking-[-0.02em]">I passed</span>
            <span className="text-sm text-muted-foreground">Tell the next person what helped</span>
          </button>
          <button type="button" onClick={() => pick(false)} className={tile}>
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground/70">
              <RotateCcw className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-[-0.02em]">Not this time</span>
            <span className="text-sm text-muted-foreground">Pick up where you left off</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <div className="grid justify-items-center gap-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-7" strokeWidth={3} />
        </span>
        <Header center title="Thank you." sub="Your story helps the next person start. It goes up after a quick review." />
        <Button asChild size="lg">
          <Link href="/">
            Back to CertBench
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  const passed = step === "story";
  return (
    <form
      className="grid gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        void send(passed);
      }}
    >
      {passed ? (
        <Header eyebrow={certName} title="Congratulations." sub="What helped you pass? A sentence or two is plenty." />
      ) : (
        <Header
          eyebrow={certName}
          title="That one isn't over."
          sub="Plenty of people pass on the retake. Your path picks up where you left off."
        />
      )}

      <div className="glass grid gap-5 rounded-[1.75rem] p-5 sm:p-7">
        <label className="grid gap-2">
          <span className="text-sm font-medium">{passed ? "What helped" : "What tripped you up (optional)"}</span>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value.slice(0, 600))}
            rows={4}
            required={passed}
            minLength={passed ? 10 : undefined}
            placeholder={
              passed
                ? "e.g. The readiness checkpoint showed me exactly which domains to fix. Passed first try."
                : "e.g. The performance-based questions took longer than I expected."
            }
            className="w-full resize-none rounded-xl border border-input bg-background/60 px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs text-muted-foreground">{quote.length}/600</span>
        </label>
        {passed && (
          <label className="grid gap-2">
            <span className="text-sm font-medium">Name to show</span>
            <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} />
            <span className="text-xs text-muted-foreground">Shown on CertBench with your story, after a quick review.</span>
          </label>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={saving || (passed && quote.trim().length < 10)}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {passed ? "Share my story" : quote.trim() ? "Send and go to my path" : "Go to my path"}
            {!saving && <ArrowRight />}
          </Button>
          <button
            type="button"
            onClick={() => setStep("ask")}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Change my answer
          </button>
        </div>
      </div>
    </form>
  );
}

function Header({ eyebrow, title, sub, center = false }: { eyebrow?: string; title: string; sub: string; center?: boolean }) {
  return (
    <div className={cn("grid gap-3", center ? "justify-items-center text-center" : "text-left")}>
      {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
      <h1 className="cb-display text-balance text-[2.35rem] sm:text-5xl">{title}</h1>
      <p className="max-w-md text-balance text-lg text-muted-foreground">{sub}</p>
    </div>
  );
}
