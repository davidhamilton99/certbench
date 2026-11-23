"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, RotateCcw } from "lucide-react";
import { projectFinish } from "@/core/path/checkpoint";
import { isStopDone } from "@/core/path/progress";
import type { ObjectiveStatus, PathPlan, PathProgress, PathStructure } from "@/core/path/types";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { ExamMap, type LabState, type MapRehearsal } from "./ExamMap";

/** "March 3": the page is in English, so its dates are too, whatever the browser's own language. */
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

/** The card these screens share, so "Payment received" becomes the unlock in place. */
function UnlockCard({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="cb-sheet relative overflow-hidden rounded-lg p-6 sm:p-10">
      <div className="relative grid justify-items-center gap-3 text-center">
        <p className="cb-label text-muted-foreground">{eyebrow}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Back on the path from paying, while Stripe's confirmation (the activation
 * webhook) is still on its way: usually a second or two. It says the payment
 * went through, on the path, in the unlock's own card; never the offer again.
 * `slow` once it has taken long enough to say so, with a way to look again
 * and a way back to the study path: a payment that is held up must not leave
 * the buyer on this screen with only a reload to get out.
 */
export function PathActivating({
  examName,
  slow,
  onCheck,
  onContinue,
}: {
  examName: string;
  slow: boolean;
  onCheck: () => void;
  /** Leave the wait for the study path as it stands. */
  onContinue: () => void;
}) {
  return (
    <div className="path-rise grid gap-6" role="status">
      <UnlockCard eyebrow="Payment received">
        <h1 className="cb-section">Your {examName} study path is being opened.</h1>
        {slow ? (
          <>
            <p className="max-w-md text-body text-muted-foreground">
              Your payment was successful. Stripe is taking longer than usual to confirm it, and your study path will
              open as soon as it does.
            </p>
            <Button variant="outline" className="mt-2" onClick={onCheck}>
              <RotateCcw aria-hidden />
              Check again
            </Button>
            <button type="button" onClick={onContinue} className="cb-link cb-tap text-small">
              Return to the study path
            </button>
            <p className="text-small text-muted-foreground">
              If you are still waiting after a few minutes, please email{" "}
              <a href="mailto:support@certbench.dev" className="cb-link">
                support@certbench.dev
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="max-w-md text-body text-muted-foreground">
              Your payment was successful. Confirming it with Stripe takes a moment.
            </p>
            <Loader2 className="mt-2 size-6 animate-spin text-primary" aria-hidden />
          </>
        )}
      </UnlockCard>
    </div>
  );
}

/**
 * Back from paying with nobody signed in. A bank's approval step can reopen
 * the site in another browser, where the buyer has no session; until now they
 * were shown the first visit's questions with no mention of the payment. The
 * page says that the payment arrived and asks them to sign in. Signing in
 * returns to this address, still marked as a return from paying, where the
 * wait for the confirmation begins.
 */
export function PathPaidSignIn({
  cert,
  onContinue,
}: {
  cert: string;
  /** Go on without signing in: the visit is then like any other. */
  onContinue: () => void;
}) {
  const back = `/path/${cert}?upgraded=1`;
  return (
    <div className="path-rise grid gap-6">
      <UnlockCard eyebrow="CertBench Pro">
        <h1 tabIndex={-1} className="cb-section">
          Your payment was received.
        </h1>
        <p className="max-w-md text-body text-muted-foreground">Please sign in to open your study path.</p>
        <div className="mt-2 grid w-full max-w-sm gap-2.5">
          <GoogleSignInButton next={back} />
          <Button asChild variant="outline" className="w-full">
            <Link href={`/login?next=${encodeURIComponent(back)}`}>Sign in with email</Link>
          </Button>
        </div>
        <button type="button" onClick={onContinue} className="cb-link cb-tap mt-1 text-small">
          Continue without signing in
        </button>
      </UnlockCard>
    </div>
  );
}

/**
 * The moment Pro opens a path, shown once per exam on a device: right after
 * buying, or on the first visit once Pro covers this exam. It counts what is
 * now theirs from the plan, shows the outline with its labs open, and leads on
 * (`children`, the way to the next step). It stays on the path, in the path's
 * own words: a buyer who lands somewhere unfamiliar leaves.
 */
export function PathUnlocked({
  structure,
  plan,
  progress,
  statuses,
  doneStops,
  labs,
  rehearsal,
  labsLeft,
  firstLab,
  children,
}: {
  structure: PathStructure;
  plan: PathPlan;
  progress: PathProgress;
  statuses: Map<string, ObjectiveStatus>;
  /** The ids of the steps that are finished, so the outline marks only studied objectives complete. */
  doneStops: ReadonlySet<string>;
  labs: ReadonlyMap<string, LabState>;
  rehearsal?: MapRehearsal;
  /** Labs in the exam's library not played yet, when it has one. */
  labsLeft?: number;
  /** The earliest lab not played yet, when it isn't already the next stop. */
  firstLab: { title: string; minutes: number | null; onOpen: () => void } | null;
  children: ReactNode;
}) {
  // "Today" for the projection, fixed for the life of the screen.
  const [now] = useState(() => Date.now());
  const left = plan.stops.filter((s) => !isStopDone(progress, s.id));
  const count = {
    stops: left.filter((s) => s.kind !== "practice" && s.kind !== "lab" && s.kind !== "rehearsal").length,
    practice: left.filter((s) => s.kind === "practice").length,
    labs: labsLeft ?? left.filter((s) => s.kind === "lab").length,
  };
  const library = structure.library?.length ?? 0;
  const minutes = progress.goal?.minutes || 20;
  const finish = left.length > 0 ? projectFinish(left.length, minutes, now) : null;

  return (
    <div className="path-rise grid gap-6">
      <UnlockCard eyebrow="CertBench Pro">
        {/* The screen's title. It takes the focus when the wait for the payment's confirmation ends. */}
        <h1 tabIndex={-1} className="cb-section">
          Your full {structure.examName} study path is now open.
        </h1>
        <p className="max-w-lg text-body text-muted-foreground">
          The study path continues in the same short steps. It includes{" "}
          {library > 0 ? `${library} hands-on labs` : "a hands-on lab at the end of every domain"} and timed
          practice exams that you can take at any time.
        </p>

        <dl className="mt-4 grid w-full grid-cols-3 gap-2 sm:gap-3">
          {[
            { n: count.stops, label: count.stops === 1 ? "study step" : "study steps" },
            { n: count.practice, label: count.practice === 1 ? "domain review" : "domain reviews" },
            { n: count.labs, label: count.labs === 1 ? "hands-on lab" : "hands-on labs" },
          ].map(({ n, label }) => (
            <div
              key={label}
              className="flex flex-col-reverse gap-0.5 rounded-md border border-border px-2 py-3 text-center sm:py-4"
            >
              <dt className="text-note text-muted-foreground">{label}</dt>
              <dd className="cb-display text-3xl tabular-nums sm:text-4xl">{n}</dd>
            </div>
          ))}
        </dl>

        {finish && (
          <p className="mt-2 text-small text-muted-foreground">
            At {minutes} minutes a day, you will finish by {fmt(finish)}.
          </p>
        )}
      </UnlockCard>

      {children}

      {firstLab && (
        // Its title wraps and is never cut short: the title says what the lab is.
        <button
          type="button"
          onClick={firstLab.onOpen}
          className="glass flex items-center gap-4 rounded-md p-5 text-left transition-[border-color,background-color] duration-150 hover:border-primary hover:bg-tint-hover active:bg-tint-press sm:p-6"
        >
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
          >
            <FlaskConical className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-small text-muted-foreground">
              You can also try a lab now.{firstLab.minutes ? ` It takes about ${firstLab.minutes} minutes.` : ""}
            </span>{" "}
            <span className="mt-1 block text-body font-semibold">{firstLab.title}</span>
          </span>
        </button>
      )}

      <div className="glass grid gap-5 rounded-lg p-5 sm:p-8">
        {/* Network+ is set out by CertBench's own topics, not CompTIA's objectives. */}
        <h2 className="cb-statement">
          {usesOfficialObjectiveNumbers(structure.certSlug) ? "Exam objectives" : "Exam topics"}
        </h2>
        <ExamMap structure={structure} statuses={statuses} doneStops={doneStops} labs={labs} rehearsal={rehearsal} />
      </div>
    </div>
  );
}
