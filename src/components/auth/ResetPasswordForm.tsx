"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { AUTH_WEAK_PASSWORD, authMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { AuthField, FormAlert } from "./AuthField";

const NO_MATCH = "The passwords do not match.";
const SAME_PASSWORD = "The new password must be different from your current password.";
const LINK_EXPIRED =
  "Your reset link has expired, or it was opened on a different device. Please request a new link.";
/** Shown when the password could not be saved and the service gave no more exact reason. */
const NOT_UPDATED = "Your password could not be updated. Please try again.";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const described = error ? errorId : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (password !== confirm) {
      setError(NO_MATCH);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(sentenceFor(updateError));
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(authMessage(err, NOT_UPDATED));
      setLoading(false);
      return;
    }

    router.push("/start");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthField
        id="password"
        label="New password"
        hint="Use at least 8 characters."
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        errorId={described}
        invalid={error === AUTH_WEAK_PASSWORD || error === SAME_PASSWORD}
      />
      <AuthField
        id="confirm"
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        errorId={described}
        invalid={error === NO_MATCH}
      />

      {error && (
        <FormAlert id={errorId}>
          {error}
          {error === LINK_EXPIRED && (
            <>
              {" "}
              <Link href="/forgot-password" className="cb-link">
                Request a new reset link
              </Link>
              .
            </>
          )}
        </FormAlert>
      )}

      <Button type="submit" loading={loading}>
        Update password
      </Button>
    </form>
  );
}

/**
 * The sentence for a failed update. The service's own text is never shown: it
 * is read only to tell the cases apart.
 */
function sentenceFor(error: { message?: string; code?: string }): string {
  if (error.code === "same_password") return SAME_PASSWORD;
  if (error.code === "weak_password") return AUTH_WEAK_PASSWORD;
  // A recovery session that is missing or has expired (the link was opened on
  // another device, or too late) is reported in several wordings. Each of
  // them means the same thing to the visitor: a new link is needed.
  if (/session|expired|invalid|missing|token/i.test(error.message ?? "")) return LINK_EXPIRED;
  return authMessage(error, NOT_UPDATED);
}
