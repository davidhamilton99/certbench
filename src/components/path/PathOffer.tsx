"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { addCertCheckout, enrollInPath } from "@/contracts/client";
import type { BillingInterval } from "@/contracts/billing";
import { ApiError } from "@/contracts/errors";
import { userMessage } from "@/lib/errors/user-message";
import { PAYMENT_PAGE_FAILED } from "@/lib/billing/messages";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import type { RegionPricing } from "@/lib/pricing/ppp";
import { PRO_PRICE_REGION_NOTE, proAddonTerms } from "@/lib/pricing/terms";
import { Button } from "@/components/ui/button";
import { PlanChooser, REGIONAL_PRICE_NOTE } from "@/components/billing/PlanChooser";
import { leaveFor } from "@/components/billing/leave";
import { useRegionPricing } from "@/components/billing/useRegionPricing";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { PathCert } from "@/core/path/types";

/**
 * The billing periods the study path offers, and the one chosen first. Monthly
 * comes first: it is the smaller first payment. The pricing page also sells a
 * year; which periods are sold where is the owner's decision.
 */
const OFFER_PLANS = ["monthly", "quarterly"] as const satisfies readonly BillingInterval[];
const OFFER_DEFAULT = "monthly" satisfies (typeof OFFER_PLANS)[number];

/**
 * The one ask on the path, made after the readiness checkpoint: the rest of
 * the path, monthly or for a three-month exam cycle. A Pro member who hasn't
 * added this exam yet is offered the exam instead of a second plan.
 *
 * The offer never shows a button that cannot be pressed. When the account has
 * not been reached (`certId` is null), it says so and offers to try again.
 */
export function PathOffer({
  cert,
  certId,
  examName,
  remainingStops,
  questionCount,
  proPlan,
  examDate,
  context,
  labCount,
  initialPricing,
  onRetry,
}: {
  cert: PathCert;
  /** The exam's id on the account, or null while the account has not been reached. */
  certId: string | null;
  examName: string;
  remainingStops: number;
  questionCount: number;
  proPlan: boolean;
  examDate: string | null;
  context: "reveal" | "home";
  /** Labs in the exam's library, when it has one. */
  labCount?: number;
  /**
   * The learner's regional prices, where the page already has them. Without
   * them the offer asks for them and prints no figure until it has the answer.
   */
  initialPricing?: RegionPricing;
  /** Ask for the account again. Without it, "Try again" loads the page again. */
  onRetry?: () => void | Promise<unknown>;
}) {
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("path_offer_viewed", { cert, context });
  }, [cert, context]);

  // The learner pressed "Try again" here, where the plans would be. When the
  // account then answers, the plans take the place of that button, which held
  // the keyboard's focus: the focus moves to the offer's title, so that the
  // offer is read from its top and is not lost to the top of the page. It is
  // moved only when nothing else has taken it meanwhile.
  const title = useRef<HTMLHeadingElement>(null);
  const askedHere = useRef(false);
  useEffect(() => {
    if (!certId || !askedHere.current) return;
    askedHere.current = false;
    if (document.activeElement && document.activeElement !== document.body) return;
    title.current?.focus({ preventScroll: true });
  }, [certId]);

  // What the labs are, in CertBench's own terms: nothing is claimed of how the exam's questions work.
  const labs = labCount
    ? `All ${labCount} hands-on labs, CertBench's practice for the exam's performance-based questions`
    : "A hands-on lab at the end of every domain";
  const rehearsals = `Timed practice exams of ${REHEARSAL_FORMATS.full.questions} questions in ${REHEARSAL_FORMATS.full.minutes} minutes, as often as you wish`;
  const includes = proPlan
    ? [
        `All ${remainingStops} remaining steps of your ${examName} study path`,
        labs,
        rehearsals,
        "Access through the Pro plan that you already have",
      ]
    : [
        `All ${remainingStops} remaining steps of your ${examName} study path`,
        labs,
        rehearsals,
        `All ${questionCount.toLocaleString("en-US")} ${examName} questions, with spaced review`,
      ];

  return (
    // The rule along the top is straight, so the corners it meets are square.
    <div className="glass rounded-lg rounded-t-none border-t-[3px] border-t-primary p-6 sm:p-9">
      <div className="grid gap-5">
        <div className="grid gap-1.5">
          {/* It can take the focus (see above); it is not a control. */}
          <h2 ref={title} tabIndex={-1} className="cb-subsection">
            {proPlan ? `Add ${examName} to your plan` : "Continue your study path with Pro"}
          </h2>
          <p className="text-body text-muted-foreground">
            {proPlan
              ? `One payment adds ${examName} to the Pro plan that you already have. It includes:`
              : `CertBench Pro opens the rest of your ${examName} study path, in the same short steps. It includes:`}
          </p>
        </div>

        <ul className="grid gap-2.5 text-small">
          {includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Check className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden />
              {line}
            </li>
          ))}
        </ul>

        {!certId ? (
          <AccountNotReached
            onRetry={
              onRetry &&
              (() => {
                askedHere.current = true;
                return onRetry();
              })
            }
          />
        ) : proPlan ? (
          <AddExam cert={cert} certId={certId} examName={examName} context={context} initialPricing={initialPricing} />
        ) : (
          <PlanChooser
            plans={OFFER_PLANS}
            defaultPlan={OFFER_DEFAULT}
            initialPricing={initialPricing}
            returnTo={`path/${cert}`}
            // The learner has an account: a press that finds nobody signed in is a session that has ended.
            signInHref={() => `/login?next=/path/${cert}`}
            // Pro access is granted for each exam: make this the exam the purchase opens.
            beforeCheckout={() => api(enrollInPath, { cert, examDate })}
            onPress={(plan) => track("path_offer_clicked", { cert, context, offer: "pro", interval: plan })}
          />
        )}

        {!proPlan && (
          <p className="text-note text-muted-foreground">
            <span className="font-medium text-foreground">Pass guarantee.</span> {PASS_GUARANTEE_TERMS}{" "}
            <a href={PASS_GUARANTEE_HREF} target="_blank" rel="noopener" className="cb-link">
              Read the guarantee terms
            </a>
            , which open in a new tab.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * In place of the offer, for a member whose last payment did not go through.
 * Such a member has no Pro while the payment is owed, so the page used to
 * offer them Pro, and the checkout refused the plan they pressed. What they
 * need is the billing page, where the payment method is updated. The two
 * sentences are the billing page's own (/upgrade).
 */
export function PathPaymentPastDue() {
  return (
    // A notice, not the offer: it has no rule in the pressable colour along its top.
    <div className="glass grid gap-5 rounded-lg p-6 sm:p-9">
      <div className="grid gap-1.5">
        <h2 className="cb-subsection">Your last payment did not go through.</h2>
        <p className="cb-measure text-body text-muted-foreground">
          Please update your payment method to keep CertBench Pro.
        </p>
      </div>
      <Button asChild size="lg" className="w-full justify-self-start sm:w-auto">
        <Link href="/upgrade">Manage billing</Link>
      </Button>
    </div>
  );
}

/** In place of a button that could not work: what is wrong, and the way to put it right. */
function AccountNotReached({ onRetry }: { onRetry?: () => void | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);

  async function retry() {
    if (!onRetry) {
      window.location.reload();
      return;
    }
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p role="status" className="text-small">
        Your account could not be reached.
      </p>
      <Button variant="outline" className="justify-self-start" loading={busy} onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

/** A Pro member adds this exam to their plan: one price, one payment, no period to choose. */
function AddExam({
  cert,
  certId,
  examName,
  context,
  initialPricing,
}: {
  cert: PathCert;
  certId: string;
  examName: string;
  context: "reveal" | "home";
  initialPricing?: RegionPricing;
}) {
  const pricing = useRegionPricing(initialPricing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Back from the payment page through the browser's own button: the page is
  // shown as it was left, so the button is made ready again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function add() {
    if (busy) return;
    setBusy(true);
    setError("");
    track("path_offer_clicked", { cert, context, offer: "add_exam" });
    try {
      const { url } = await api(addCertCheckout, { certId });
      // Counted only once there is a payment page to go to.
      track("checkout_started", { interval: "cert_addon" });
      leaveFor(url);
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        leaveFor(`/login?next=/path/${cert}`);
        return;
      }
      setError(userMessage(err, PAYMENT_PAGE_FAILED));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="grid gap-1">
        {/* The figure's line keeps its height while the price is not yet known, so nothing moves when it arrives. */}
        <span className="cb-display block h-12 text-5xl leading-[3rem]">{pricing?.prices.quarterly.discounted}</span>{" "}
        <span className="text-small text-muted-foreground">as a single payment</span>
      </p>
      {/* What the payment buys and for how long, in the words of the pricing page and the billing page: the
          exam is open only while the Pro plan is active. The study path sends the price with the account. */}
      {pricing && (
        <p className="text-small text-muted-foreground">{proAddonTerms(pricing.prices.quarterly.discounted)}</p>
      )}
      <div className="grid gap-2">
        <Button size="lg" className="w-full" loading={busy} onClick={add}>
          Add {examName}
        </Button>
        <span role="status" className="sr-only">
          {busy ? "The payment page is opening." : ""}
        </span>
        {error && (
          <p role="alert" className="text-small text-destructive">
            {error}
          </p>
        )}
        <p className="text-note text-muted-foreground">
          {pricing && pricing.discountPercent !== null ? REGIONAL_PRICE_NOTE : PRO_PRICE_REGION_NOTE}
        </p>
      </div>
    </div>
  );
}
