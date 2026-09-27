"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sessionError, setSessionError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      // A missing/expired recovery session (e.g. the link was opened on a
      // different device, or it expired) surfaces as "Auth session missing".
      // Show a recoverable message instead of a raw error dead-end.
      const isSession = /session|expired|invalid|missing|token/i.test(
        updateError.message
      );
      setSessionError(isSession);
      setError(
        isSession
          ? "Your reset link has expired or was opened on a different device. Request a new one below."
          : updateError.message
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="Repeat your new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{error}</p>
          {sessionError && (
            <Link
              href="/forgot-password"
              className="mt-1 inline-block font-medium underline underline-offset-2"
            >
              Request a new reset link
            </Link>
          )}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
