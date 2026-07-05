import { redirect } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import {
  FREE_DAILY_QUESTION_LIMIT,
  FREE_GENERATION_LIMIT,
  getUserPlan,
} from "@/server/services/subscription";
import { ManageBillingButton } from "@/components/workspace/UpgradePanel";
import { PlanPicker } from "@/components/billing/PlanPicker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Upgrade",
};

const PRO_FEATURES = [
  "Unlimited practice questions and full-length exams",
  "Every PBQ simulation and concept drill",
  "Unlimited AI question generation with file upload",
  "Pass guarantee — study with Pro for 30+ days, and if you don't pass we refund your last payment",
];

const REASONS: Record<string, string> = {
  "daily-limit":
    "You've hit the free plan's 20 questions for today. Pro removes the limit so you can keep the momentum.",
  pbq: "That scenario is part of Pro. Upgrade to unlock every PBQ simulation and drill.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getUserPlan(db, user.id);
  const reasonText = reason ? REASONS[reason] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {plan.plan === "pro" ? "Your subscription" : "Upgrade to Pro"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {plan.plan === "pro"
            ? "You're on Pro — thanks for supporting CertBench"
            : `Free plan · ${plan.questionsUsedToday}/${FREE_DAILY_QUESTION_LIMIT} questions today · ${plan.generationsUsed}/${FREE_GENERATION_LIMIT} AI generations this month`}
        </p>
      </div>

      {reasonText && plan.plan !== "pro" && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          {reasonText}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CertBench Pro</CardTitle>
          <CardDescription>
            Everything, without limits — priced for one exam cycle
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <ul className="grid gap-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
          {plan.plan === "pro" ? (
            <div className="pt-2">
              <ManageBillingButton />
            </div>
          ) : (
            <PlanPicker />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
