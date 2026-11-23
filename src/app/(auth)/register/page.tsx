import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RegisterLead } from "@/components/auth/RegisterLead";
import { RegisterNextSteps, type NextStep } from "@/components/auth/RegisterNextSteps";
import { MINUTES_PER_STOP } from "@/core/path/plan";
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_SCOPE_TERMS } from "@/lib/pricing/terms";

export const metadata = {
  title: "Create account",
};

const EXAMS = "You can study for Security+, Network+, A+ Core 1 or A+ Core 2.";
const STEP_LENGTH = `Each step takes about ${MINUTES_PER_STOP} minutes.`;

/**
 * What happens after the account is made, in the order it happens. Session
 * replays showed visitors who had decided to sign up stopping at the bare
 * form; this answers what comes next and what it costs, at the moment those
 * two questions end a sign-up.
 */
const NEXT_STEPS: NextStep[] = [
  {
    title: "Choose your exam.",
    body: EXAMS,
  },
  {
    title: "Study in short steps.",
    body: `${STEP_LENGTH} Your first study step and the readiness checkpoint are free.`,
  },
  {
    title: "Continue with Pro if you wish.",
    body: `Pro opens the rest of the study path. ${PASS_GUARANTEE_TERMS}`,
  },
];

/**
 * The same, for a visitor who chose a plan on the pricing page and was sent
 * here to make an account first: payment comes next, and the exam is chosen
 * after it (a buyer lands on the exam list).
 */
const NEXT_STEPS_PAYING: NextStep[] = [
  {
    title: "Pay for the plan that you chose.",
    body: "You return to the pricing page, where your plan is still selected. Payment is handled by Stripe.",
  },
  {
    title: "Choose your exam.",
    body: `${EXAMS} ${PRO_SCOPE_TERMS}`,
  },
  {
    title: "Study in short steps.",
    body: `${STEP_LENGTH} ${PASS_GUARANTEE_TERMS}`,
  },
];

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
      {/* The form comes first in the document, so "Create your account" is the
          page's h1 at every width and the first heading a screen reader meets.
          On a wide screen the list of what happens next is drawn to its left. */}
      <AuthCard
        title="Create your account"
        description={<RegisterLead />}
        className="max-w-none lg:col-start-2 lg:row-start-1"
      >
        <RegisterForm />
      </AuthCard>
      <RegisterNextSteps free={NEXT_STEPS} paying={NEXT_STEPS_PAYING} />
    </div>
  );
}
