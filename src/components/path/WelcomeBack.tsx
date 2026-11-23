"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";

/**
 * Signed out on a device that holds an account's study path for this exam: the
 * way back into that account comes first. Without it the path opened blank, as
 * if the learner were new; one who had been signed out by mistake answered the
 * introductory questions twice more (session replay, November 16, 2026).
 * Carrying on without an account stays one press away.
 */
export function WelcomeBack({
  cert,
  examName,
  stopsDone,
  onPlay,
}: {
  cert: string;
  examName: string;
  /** The account's steps done, as this device last saw them. */
  stopsDone: number;
  /** Carry on here without signing in: the work joins whichever account signs in next. */
  onPlay: () => void;
}) {
  const path = `/path/${cert}`;
  return (
    <div className="glass path-rise grid gap-6 rounded-lg p-5 sm:p-8">
      <div className="grid gap-2">
        <p className="cb-label text-muted-foreground">Welcome back</p>
        {/* The screen's title, which can take the focus when the screen is shown in answer to a press. */}
        <h1 tabIndex={-1} className="cb-section">
          Your {examName} study path is saved in your account.
        </h1>
        <p className="text-body text-muted-foreground">
          {stopsDone > 0 && (
            <>
              You have completed {stopsDone} {stopsDone === 1 ? "step" : "steps"}.{" "}
            </>
          )}
          Sign in to continue from where you stopped.
        </p>
      </div>
      <div className="grid gap-2.5 sm:max-w-sm">
        <GoogleSignInButton next={path} />
        <Button asChild variant="outline" className="w-full">
          <Link href={`/login?next=${path}`}>Sign in with email</Link>
        </Button>
      </div>
      <button type="button" onClick={onPlay} className="cb-link cb-tap w-fit text-small">
        Continue without signing in
      </button>
    </div>
  );
}
