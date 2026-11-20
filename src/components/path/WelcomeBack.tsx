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
      <div className="glass grid gap-6 rounded-3xl p-6 sm:p-8">
        <div className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Welcome back</span>
          <h1 className="cb-display text-balance text-[2.35rem] sm:text-5xl">
            Your {examName} path is in your account
          </h1>
          <p className="text-muted-foreground">
            {stopsDone > 0 && (
              <>
                {stopsDone} {stopsDone === 1 ? "stop" : "stops"} done.{" "}
              </>
            )}
            Sign in to pick up where you left off.
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
          Play without signing in
        </button>
      </div>
    </div>
  );
}
