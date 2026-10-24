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
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";

export const metadata = {
  title: "Create account",
};

/**
 * The rail sets up the goal-setting flow the user is about to enter — in the
 * flow's own voice (desktop only, so the form stays first on mobile). Replays
 * showed visitors arriving convinced but stalling at the bare form; this
 * answers "what happens next?" and "what's this going to cost?" honestly, at
 * the moment those questions kill signups.
 */
const NEXT_STEPS: { icon: ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    icon: Target,
    title: "Set your goal",
    body: "Your cert, your exam date, and how you study.",
  },
  {
    icon: Sparkles,
    title: "Get your plan",
    body: "Built around your exam and your pace — in two minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Pass guarantee",
    body: PASS_GUARANTEE_TERMS,
  },
];

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
      <aside className="hidden lg:block">
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">
          Build your study plan
        </h1>
        <p className="mt-3 text-muted-foreground">
          Two minutes to set up. Then just show up.
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
            Then build your plan — it takes two minutes.
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            Building your plan is free · Studying it is Pro
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
