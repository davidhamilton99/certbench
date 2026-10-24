import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Check, Lock, Plus } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import { regionPricing } from "@/lib/pricing/ppp";
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { getUserPlan } from "@/server/services/subscription";
import { ManageBillingButton } from "@/components/workspace/UpgradePanel";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { UpgradeSuccess } from "@/components/billing/UpgradeSuccess";
import { AddCertButton } from "@/components/billing/AddCertButton";
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
  `Pass guarantee: ${PASS_GUARANTEE_TERMS}`,
];

const REASONS: Record<string, string> = {
  "daily-limit":
    "You've hit the free plan's 20 questions for today. Pro removes the limit so you can keep the momentum.",
  pbq: "That scenario is part of Pro. Upgrade to unlock every PBQ simulation and drill.",
  "cert-locked":
    "That certification isn't part of your plan yet. Your plan covers the cert you're studying.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; upgraded?: string; added?: string }>;
}) {
  const { reason, upgraded, added } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getUserPlan(db, user.id);

  // Post-checkout landing (success_url). Show the payoff and forward into the
  // app once the activation webhook has flipped the account to Pro.
  if (upgraded === "true") {
    return <UpgradeSuccess isPro={plan.plan === "pro"} />;
  }
  const reasonText = reason ? REASONS[reason] : undefined;
  const isPro = plan.plan === "pro";

  // Resolve the region price server-side so the first paint is correct —
  // no flash of the full list price before a client fetch resolves.
  const country = (await headers()).get("x-vercel-ip-country");
  const pricing = regionPricing(country);

  // Pro users manage their certs here: access is scoped to the cert they
  // bought, so show what's covered and the catalog of certs they can add.
  const [enrollments, allCerts] = isPro
    ? await Promise.all([listEnrollments(db, user.id), listActiveCertifications(db)])
    : [[], []];
  const certById = new Map(allCerts.map((c) => [c.id, c]));
  const enrolledCerts = enrollments.flatMap((e) => {
    const c = certById.get(e.certificationId);
    return c ? [c] : [];
  });
  const enrolledIds = new Set(enrollments.map((e) => e.certificationId));
  const otherCerts = allCerts.filter((c) => !enrolledIds.has(c.id));

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {isPro ? "Your plan" : "Upgrade to Pro"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPro
            ? "You're on Pro — thanks for supporting CertBench"
            : "Unlock your personalised plan — everything, until you pass."}
        </p>
      </div>

      {added && (
        <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-success" />
          Certification added — it&apos;s in your plan now. It may take a moment
          to appear.
        </div>
      )}

      {reasonText && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          {reasonText}
        </div>
      )}

      {isPro ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Your certification{enrolledCerts.length > 1 ? "s" : ""}
              </CardTitle>
              <CardDescription>
                Pro unlocks everything for{" "}
                {enrolledCerts.length > 1 ? "these exams" : "this exam"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {enrolledCerts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border bg-primary/5 px-4 py-3 text-sm"
                >
                  <Check className="size-4 shrink-0 text-success" />
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.examCode}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {otherCerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Add a certification</CardTitle>
                <CardDescription>
                  Studying for more than one? Add another exam to your plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {otherCerts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{c.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.examCode}
                      </span>
                    </span>
                    <AddCertButton
                      certId={c.id}
                      price={pricing.prices.quarterly.discounted}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div>
            <ManageBillingButton />
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>CertBench Pro</CardTitle>
            <CardDescription>
              Everything for the certification you&apos;re studying, without limits
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
            <PlanPicker initialPricing={pricing} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
