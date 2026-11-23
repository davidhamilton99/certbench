"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { loadBrowserClient } from "@/lib/supabase-lazy";
import {
  AUTH_ALREADY_REGISTERED,
  AUTH_INVALID_EMAIL,
  AUTH_UNREACHABLE,
  AUTH_WEAK_PASSWORD,
  AUTH_WRONG_CREDENTIALS,
  authMessage,
} from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { AuthField, FormAlert, TermsNote } from "./AuthField";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Mode = "signup" | "login";

/** Shown when an account could not be created and the service gave no more exact reason. */
const NOT_CREATED = "Your account could not be created. Please try again.";
/** The visitor is signed in, but what the page does next (saving, opening a score) failed. */
const NEXT_STEP_FAILED = "You are signed in, but the next step could not be opened. Please reload the page.";

/**
 * Create an account, or sign in, without leaving the page: for the moments
 * where a trip to /register would lose the visitor. Email confirmation is off,
 * so creating an account returns a session and `onSignedIn` runs right here.
 * Google sign-in has to leave the page, and returns to `nextPath`.
 */
export function InlineSignup({
  nextPath,
  submitLabel,
  onSignedIn,
  staysOnPage = true,
}: {
  /** Where Google sign-in returns to. */
  nextPath: string;
  submitLabel: string;
  onSignedIn: (
    userId: string,
    email: string | undefined,
    method: "email_signup" | "email_login"
  ) => Promise<void> | void;
  /** false where creating the account moves on to another page, so the form does not say that they stay. */
  staysOnPage?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;
  const described = error ? errorId : undefined;
  const emailRef = useRef<HTMLInputElement>(null);
  const signup = mode === "signup";

  /** The other form takes this one's place, and the keyboard starts at its first field. */
  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    emailRef.current?.focus();
  }

  /** The page's own next step. If it fails, the form says so and is ready again. */
  async function finish(userId: string, userEmail: string | undefined, method: "email_signup" | "email_login") {
    try {
      await onSignedIn(userId, userEmail, method);
    } catch {
      setError(NEXT_STEP_FAILED);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    const supabase = await loadBrowserClient().catch(() => null);
    if (!supabase) {
      setError(AUTH_UNREACHABLE);
      setBusy(false);
      return;
    }

    try {
      if (!signup) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError || !data.user) {
          setError(authMessage(loginError));
          return;
        }
        await finish(data.user.id, data.user.email, "email_login");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/verify` },
      });
      if (signUpError) {
        const message = authMessage(signUpError, NOT_CREATED);
        // The address has an account already: the form becomes the sign-in form.
        if (message === AUTH_ALREADY_REGISTERED) setMode("login");
        setError(message);
        return;
      }
      track("signup_submitted", { method: "email" });
      if (!data.session || !data.user) {
        // Email confirmation has been switched on again: the work stays on this device meanwhile.
        setNotice("Please check your inbox and confirm your email address. Then sign in here to continue.");
        setMode("login");
        return;
      }
      await finish(data.user.id, data.user.email, "email_signup");
    } catch (err) {
      setError(authMessage(err, signup ? NOT_CREATED : undefined));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <GoogleSignInButton next={nextPath} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-note text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField
            ref={emailRef}
            id={`${id}-email`}
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errorId={described}
            invalid={
              error === AUTH_WRONG_CREDENTIALS || error === AUTH_ALREADY_REGISTERED || error === AUTH_INVALID_EMAIL
            }
          />
          <AuthField
            id={`${id}-password`}
            label="Password"
            hint={signup ? "Use at least 8 characters." : undefined}
            type="password"
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errorId={described}
            invalid={error === AUTH_WRONG_CREDENTIALS || error === AUTH_WEAK_PASSWORD}
          />
        </div>

        {!signup && (
          <p className="text-note">
            <Link href="/forgot-password" className="cb-link cb-tap">
              Forgotten your password?
            </Link>
          </p>
        )}

        {error && <FormAlert id={errorId}>{error}</FormAlert>}
        {notice && (
          <p role="status" className="text-small text-muted-foreground">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          {signup ? submitLabel : "Sign in and continue"}
        </Button>
        {signup && <TermsNote className="text-center" />}
      </form>

      <p className="text-center text-note text-muted-foreground">
        {signup ? (
          <>
            The account is free, and no payment card is required.{staysOnPage && " You will stay on this page."} Do you
            already have an account?{" "}
            <button type="button" onClick={() => switchMode("login")} className="cb-link cb-tap">
              Sign in
            </button>
          </>
        ) : (
          <>
            Are you new to CertBench?{" "}
            <button type="button" onClick={() => switchMode("signup")} className="cb-link cb-tap">
              Create a free account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
