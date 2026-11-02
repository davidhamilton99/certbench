import type { ComponentType } from "react";
import { ShieldCheck, Sparkles, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { MINUTES_PER_STOP } from "@/core/path/plan";
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";

export const metadata = {
  title: "Create account",
};

/**
 * The rail sets up the guided path the user is about to enter (desktop only,
 * so the form stays first on mobile). Replays showed visitors arriving
 * convinced but stalling at the bare form; this answers "what happens next?"
 * and "what's this going to cost?" honestly, at the moment those questions
 * kill signups.
 */
const NEXT_STEPS: { icon: ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    icon: Target,
    title: "Pick your exam",
    body: "Security+, Network+, or A+ Core 1 or 2.",
  },
  {
    icon: Sparkles,
    title: "Play short stops",
    body: `About ${MINUTES_PER_STOP} minutes of quick questions each, free through your readiness checkpoint.`,
  },
  {
    icon: ShieldCheck,
    title: "Go further with Pro",
    body: `The rest of the path, when you want it. ${PASS_GUARANTEE_TERMS}`,
  },
];

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
      <aside className="hidden lg:block">
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">
          Your guided path to the exam
        </h1>
        <p className="mt-3 text-muted-foreground">
          One short stop at a time. No card needed.
        </p>
        <ol className="mt-8 grid gap-5">
          {NEXT_STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-display text-xl font-bold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription>
            Free, no card. Then pick your exam and start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
