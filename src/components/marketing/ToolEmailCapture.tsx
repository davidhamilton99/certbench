"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { api } from "@/lib/api-client";
import { ApiError } from "@/contracts/common";
import { captureToolLead, type ToolSource } from "@/contracts/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Email capture for the free public tools. Turns an anonymous drill session
 * into a re-engageable lead: the visitor gets a study-plan email, we get an
 * address to nurture toward an account. Deliberately low-friction — one field,
 * no account, honest promise.
 */
export function ToolEmailCapture({
  source,
  context,
  heading = "Get a free study plan by email",
  blurb = "We'll send a personalised plan to take you from here to a pass — no account needed.",
}: {
  source: ToolSource;
  context?: Record<string, string | number>;
  heading?: string;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      await api(captureToolLead, { email: email.trim(), source, context });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.code === "rate_limited") {
        setError("Too many tries — give it a minute.");
      } else if (err instanceof ApiError && err.code === "validation_failed") {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong — try again.");
      }
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/5 px-5 py-4">
        <Check className="size-5 shrink-0 text-success" />
        <p className="text-sm">
          <span className="font-medium">Check your inbox</span> — your study plan
          is on the way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-card p-5">
      <div>
        <h3 className="font-semibold tracking-tight">{heading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          autoComplete="email"
          className="sm:flex-1"
        />
        <Button type="submit" disabled={status === "loading"}>
          <Mail className="size-4" />
          {status === "loading" ? "Sending…" : "Email me a plan"}
        </Button>
      </div>
      {status === "error" && <p className="text-xs text-danger">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        One email with your study plan. Unsubscribe anytime.
      </p>
    </form>
  );
}
