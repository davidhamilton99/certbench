"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";

/**
 * Signed out on a device that holds an account's path for this exam: the way
 * back into that account comes first. Without it the path opened blank, as if
 * they were new, under a home-page card that had just said "Pick up where you
 * left off"; a learner signed out by mistake played the warm-up twice more
 * (replay, Nov 16). Playing on without an account stays one tap away.
 */
export function WelcomeBack({
  cert,
  examName,
  stopsDone,
  onPlay,
}: {
  cert: string;
  examName: string;
  /** The account's stops done, as this device last saw them. */
  stopsDone: number;
  /** Play here without signing in: the work joins whichever account signs in next. */
  onPlay: () => void;
}) {
  const path = `/path/${cert}`;
  return (
    <div className="path-rise grid gap-6">
      <div className="glass grid gap-6 rounded-lg p-6 sm:p-8">
        <div className="grid gap-2">
          <span className="cb-label text-muted-foreground">Welcome back</span>
          <h1 className="cb-display text-balance text-[1.875rem] sm:text-[2.5rem]">
            Your {examName} study path is saved in your account.
          </h1>
          <p className="leading-relaxed text-muted-foreground">
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
        <button
          type="button"
          onClick={onPlay}
          className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Continue without signing in
        </button>
      </div>
    </div>
  );
}
