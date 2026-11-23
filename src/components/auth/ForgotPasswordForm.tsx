"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { AUTH_INVALID_EMAIL, authMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { AuthField, FormAlert } from "./AuthField";

/** Shown when the reset link could not be sent and the service gave no more exact reason. */
const NOT_SENT = "The link could not be sent. Please try again.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const sentRef = useRef<HTMLParagraphElement>(null);

  // The form is replaced by its confirmation, and the button that had the
  // focus goes with it. The confirmation takes the focus, so a screen reader
  // reads it and the keyboard continues from there.
  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      // The link in the email leads through /auth/callback, which exchanges
      // its code for a session before the visitor reaches the form that sets
      // the new password. A link straight to /reset-password arrived with no
      // session, and the new password could not be saved.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) {
        setError(authMessage(resetError, NOT_SENT));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(authMessage(err, NOT_SENT));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p ref={sentRef} tabIndex={-1} className="text-small text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, a link to reset the
          password has been sent to that address.
        </p>
        <Button asChild variant="outline">
          <Link href="/login">Return to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthField
        id="email"
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        errorId={error ? errorId : undefined}
        invalid={error === AUTH_INVALID_EMAIL}
      />

      {error && <FormAlert id={errorId}>{error}</FormAlert>}

      <Button type="submit" loading={loading}>
        Send reset link
      </Button>

      <p className="text-center text-small text-muted-foreground">
        Do you remember your password?{" "}
        <Link href="/login" className="cb-link">
          Sign in
        </Link>
      </p>
    </form>
  );
}
