import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account",
};

/**
 * Steps mirror the landing page's "How it works" — same claims, same
 * numbered-circle style — so the page reassures without introducing
 * anything new to evaluate. Session replays show visitors arriving here
 * convinced but stalling at the bare form; the rail (desktop only, so the
 * form stays first on mobile) answers "what happens next?" and "does this
 * cost anything?" at the exact moment those questions kill signups.
 */
const NEXT_STEPS: [string, string][] = [
  [
    "Take the 25-question diagnostic",
    "Establishes your baseline across every exam domain in about twenty minutes.",
  ],
  [
    "See your readiness score",
    "A domain-by-domain breakdown of exactly where you stand today.",
  ],
  [
    "Follow your daily plan",
    "Ordered by impact: overdue reviews first, then your weakest domain.",
  ],
];

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
      <aside className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">
          What happens next
        </h1>
        <ol className="mt-6 grid gap-5">
          {NEXT_STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Create your account</CardTitle>
          <CardDescription>
            Start studying with a personalised plan
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card required
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
