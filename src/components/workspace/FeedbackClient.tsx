"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { submitTestimonial } from "@/contracts/testimonials";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CertOption {
  certId: string;
  certName: string;
}

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

  async function submit() {
    if (quote.trim().length < 10) {
      toast.error("A sentence or two, please — at least 10 characters.");
      return;
    }
    setSaving(true);
    try {
      await api(submitTestimonial, {
        certId: certId || null,
        passed: true,
        quote: quote.trim(),
        displayName: displayName.trim() || "A CertBench user",
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="grid justify-items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <h2 className="text-lg font-semibold tracking-tight">Thank you!</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your story is in — we review submissions before they go live, and
            it may soon help someone decide to start studying. Congratulations
            on the pass. 🎉
          </p>
          <Button asChild className="mt-1">
            <Link href="/dashboard">Back to your dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Pass / not this time */}
      <div className="grid gap-2">
        <Label>Did you pass?</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPassed(true)}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              passed === true
                ? "border-success bg-success/10 text-success ring-1 ring-success"
                : "hover:border-muted-foreground/40"
            )}
          >
            I passed 🎉
          </button>
          <button
            type="button"
            onClick={() => setPassed(false)}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              passed === false
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:border-muted-foreground/40"
            )}
          >
            Not this time
          </button>
        </div>
      </div>

      {passed === true && (
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <PartyPopper className="size-4" />
              Congratulations! Share how CertBench helped.
            </div>

            {options.length > 1 && (
              <div className="grid gap-1.5">
                <Label htmlFor="fb-cert">Which exam?</Label>
                <select
                  id="fb-cert"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
              <textarea
                id="fb-quote"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={4}
                maxLength={600}
                placeholder="e.g. The readiness score told me exactly when I was ready. Passed Security+ first try with a 780."
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <span className="text-xs text-muted-foreground">
                {quote.length}/600 · shown publicly after a quick review.
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="fb-name">Display name</Label>
              <Input
                id="fb-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="How you'd like to be credited"
              />
            </div>

            <Button
              onClick={submit}
              disabled={saving || quote.trim().length < 10}
              className="justify-self-start"
            >
              {saving && <Loader2 className="animate-spin" />}
              Share my story
            </Button>
          </CardContent>
        </Card>
      )}

      {passed === false && (
        <Card>
          <CardContent className="grid gap-3 py-6 text-sm">
            <p className="font-medium">
              That&apos;s not the end — most people who retake pass.
            </p>
            <p className="text-muted-foreground">
              Your progress is saved. Head back to your plan: your weakest
              domains are already queued, and spaced repetition will bring back
              exactly what tripped you up. You&apos;ve got this.
            </p>
            <Button asChild className="mt-1 justify-self-start">
              <Link href="/dashboard">Back to studying</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
