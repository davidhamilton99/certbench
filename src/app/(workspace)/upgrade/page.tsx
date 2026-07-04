import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import {
  FREE_GENERATION_LIMIT,
  getUserPlan,
} from "@/server/services/subscription";
import {
  ManageBillingButton,
  UpgradeButton,
} from "@/components/workspace/UpgradePanel";
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
  "Unlimited AI question generation",
  "All practice exams, PBQs, and spaced repetition",
  "Priority support",
];

export default async function UpgradePage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getUserPlan(db, user.id);

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {plan.plan === "pro" ? "Your subscription" : "Upgrade to Pro"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {plan.plan === "pro"
            ? "You're on Pro — thanks for supporting CertBench"
            : `Free plan: ${plan.generationsUsed}/${FREE_GENERATION_LIMIT} AI generations used this month`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CertBench Pro</CardTitle>
          <CardDescription>Everything, without limits</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="grid gap-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            {plan.plan === "pro" ? <ManageBillingButton /> : <UpgradeButton />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
