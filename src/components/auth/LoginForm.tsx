"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { AUTH_LINK_EXPIRED, AUTH_WRONG_CREDENTIALS, authMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { AuthField, FormAlert } from "./AuthField";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { withReturnPath } from "./return-path";
import { usePageQuery, useReturnPath } from "./useReturnPath";

export function LoginForm() {
  const router = useRouter();
  const query = usePageQuery();
  // Where signing in leads: back to the page that asked for it, or to /start,
  // which opens the study path of the visitor's exam.
  const next = useReturnPath();
  // An emailed link that could not be used (it had expired, or had been used
  // already) is sent here with this flag, and the page says so.
  const linkFailed = query.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const described = error ? errorId : undefined;
  const wrong = error === AUTH_WRONG_CREDENTIALS;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(authMessage(signInError));
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(authMessage(err));
      setLoading(false);
      return;
    }

    router.push(next ?? "/start");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleSignInButton next={next ?? "/start"} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-note text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {linkFailed && !error && (
          <FormAlert id={`${errorId}-link`}>
            {AUTH_LINK_EXPIRED}{" "}
            <Link href="/forgot-password" className="cb-link">
              Request a new link to reset your password
            </Link>
            .
          </FormAlert>
        )}

        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          errorId={described}
          invalid={wrong}
        />
        {/* The reset link comes after the password field in the document, so
            the Tab key goes from the email address to the password. */}
        <div className="grid gap-2">
          <AuthField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            errorId={described}
            invalid={wrong}
          />
          <p className="text-note">
            <Link href="/forgot-password" className="cb-link cb-tap">
              Forgotten your password?
            </Link>
          </p>
        </div>

        {error && <FormAlert id={errorId}>{error}</FormAlert>}

        <Button type="submit" loading={loading} className="mt-1">
          Sign in
        </Button>

        <p className="text-center text-small text-muted-foreground">
          Are you new to CertBench?{" "}
          <Link href={withReturnPath("/register", next)} className="cb-link">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
