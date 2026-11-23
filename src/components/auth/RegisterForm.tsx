"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { AUTH_ALREADY_REGISTERED, AUTH_INVALID_EMAIL, AUTH_WEAK_PASSWORD, authMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { AuthField, FormAlert, TermsNote } from "./AuthField";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { withReturnPath } from "./return-path";
import { useReturnPath } from "./useReturnPath";

/** Shown when an account could not be created and the service gave no more exact reason. */
const NOT_CREATED = "Your account could not be created. Please try again.";

export function RegisterForm() {
  const router = useRouter();
  // Where the new account goes next: back to the page that sent the visitor
  // here (the pricing page, with the chosen plan), or to /start to choose an exam.
  const next = useReturnPath();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const described = error ? errorId : undefined;
  const signInHref = withReturnPath("/login", next);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    // The name is optional. When it is left empty nothing is sent, and the
    // database names the profile from the first part of the email address
    // (the `handle_new_user` trigger). An empty string would be stored as it is.
    const name = displayName.trim();
    let hasSession = false;
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(name && { data: { display_name: name } }),
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });
      if (signUpError) {
        setError(authMessage(signUpError, NOT_CREATED));
        setLoading(false);
        return;
      }
      hasSession = Boolean(data.session);
    } catch (err) {
      setError(authMessage(err, NOT_CREATED));
      setLoading(false);
      return;
    }

    track("signup_submitted", { method: "email" });
    // Email confirmation is off, so creating an account signs the visitor in
    // and they go straight on. If confirmation is ever switched on again there
    // is no session yet, and the next page asks them to open the email.
    router.push(hasSession ? (next ?? "/start") : "/verify");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleSignInButton next={next ?? undefined} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-note text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField
          id="displayName"
          label="Display name (optional)"
          hint="If you leave this empty, the first part of your email address is used."
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />
        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          errorId={described}
          invalid={error === AUTH_ALREADY_REGISTERED || error === AUTH_INVALID_EMAIL}
        />
        <AuthField
          id="password"
          label="Password"
          hint="Use at least 8 characters."
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          errorId={described}
          invalid={error === AUTH_WEAK_PASSWORD}
        />

        {error && (
          <FormAlert id={errorId}>
            {error}
            {error === AUTH_ALREADY_REGISTERED && (
              <>
                {" "}
                <Link href={signInHref} className="cb-link">
                  Go to the sign-in page
                </Link>
                .
              </>
            )}
          </FormAlert>
        )}

        <Button type="submit" loading={loading} className="mt-1">
          Create account
        </Button>
        <TermsNote className="text-center" />

        <p className="text-center text-small text-muted-foreground">
          Do you already have an account?{" "}
          <Link href={signInHref} className="cb-link">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
