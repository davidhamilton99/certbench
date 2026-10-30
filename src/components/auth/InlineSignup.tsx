"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Mode = "signup" | "login";

/**
 * Create an account (or log in) without leaving the page — for moments where
 * a redirect to /register would lose the visitor. Email confirmation is off,
 * so a signup returns a live session and `onSignedIn` fires right here.
 * Google sign-in has to redirect; it returns to `nextPath`.
 */
export function InlineSignup({
  nextPath,
  submitLabel,
  onSignedIn,
}: {
  /** Where Google sign-in returns to. */
  nextPath: string;
  submitLabel: string;
  onSignedIn: (
    userId: string,
    email: string | undefined,
    method: "email_signup" | "email_login"
  ) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const supabase = createClient();

    if (mode === "login") {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError || !data.user) {
        setError(
          /invalid login/i.test(loginError?.message ?? "")
            ? "That email and password don't match."
            : (loginError?.message ?? "Couldn't log you in. Try again.")
        );
        setBusy(false);
        return;
      }
      await onSignedIn(data.user.id, data.user.email, "email_login");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/verify` },
    });
    if (signUpError) {
      if (/already registered/i.test(signUpError.message)) {
        setMode("login");
        setError("You already have an account with that email. Log in to keep going.");
      } else {
        setError(signUpError.message);
      }
      setBusy(false);
      return;
    }
    track("signup_submitted", { method: "email" });
    if (!data.session || !data.user) {
      // Email confirmation is switched back on: progress stays on this device.
      setNotice("Check your inbox to confirm your email, then log in here to keep going.");
      setMode("login");
      setBusy(false);
      return;
    }
    await onSignedIn(data.user.id, data.user.email, "email_signup");
  }

  return (
    <div className="grid gap-3">
      <GoogleSignInButton next={nextPath} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "Password, 8+ characters" : "Password"}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy && <Loader2 className="animate-spin" />}
          {mode === "signup" ? submitLabel : "Log in and keep going"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "signup" ? (
          <>
            Free account, no card. You stay right here. Already have one?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-primary underline underline-offset-4"
            >
              Log in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="text-primary underline underline-offset-4"
            >
              Create a free account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
