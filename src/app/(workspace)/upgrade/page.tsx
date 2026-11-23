import { headers } from "next/headers";
import Link from "next/link";
import { requireUserPage } from "@/server/auth";
import { regionPricing } from "@/lib/pricing/ppp";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { otherVersions } from "@/core/path/versions";
import { FREE_DAILY_QUESTION_LIMIT, getUserPlan } from "@/server/services/subscription";
import { ManageBillingButton } from "@/components/workspace/UpgradePanel";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { AddCertButton } from "@/components/billing/AddCertButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Plan and billing",
};

// The same list as the pricing page and the path's own offer: what Pro holds today.
const PRO_FEATURES = [
  "The whole study path, covering every exam objective",
  "Every hands-on lab (PBQ)",
  `New timed practice exams of ${REHEARSAL_FORMATS.full.questions} questions, scored by domain`,
  "Every question for your exam, with review of the questions you answered incorrectly",
];

const REASONS: Record<string, string> = {
  "daily-limit": `You have reached the free plan's limit of ${FREE_DAILY_QUESTION_LIMIT} questions for today. Pro removes the limit.`,
  pbq: "That lab is included with Pro. Pro opens every hands-on lab and drill.",
  "cert-locked":
    "That certification is not included in your plan. Your plan covers the certification that you are studying.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; added?: string }>;
}) {
  // Paying lands on the path, not here (an old success link is sent on by the proxy).
  const { reason, added } = await searchParams;
  // Open to every account: this is where a plan is bought and where billing is managed.
  const { db, user } = await requireUserPage();

  const plan = await getUserPlan(db, user.id);
  const reasonText = reason ? REASONS[reason] : undefined;
  const isPro = plan.plan === "pro";
  // The last payment failed. The member is not offered a second subscription:
  // the card form is in the billing portal, and that is where this page sends them.
  const pastDue = plan.paymentPastDue;

  // The regional price is worked out here, on the server, so the first paint
  // shows it: the list price never flashes before a request from the browser.
  const country = (await headers()).get("x-vercel-ip-country");
  const pricing = regionPricing(country);

  // A Pro member manages their exams here: access is for the exam that was
  // bought, so the page shows what the plan covers and the exams that can be added.
  const [enrollments, allCerts] = isPro
    ? await Promise.all([listEnrollments(db, user.id), listActiveCertifications(db)])
    : [[], []];
  const certById = new Map(allCerts.map((c) => [c.id, c]));
  const enrolledCerts = enrollments.flatMap((e) => {
    const c = certById.get(e.certificationId);
    return c ? [c] : [];
  });
  const enrolledIds = new Set(enrollments.map((e) => e.certificationId));
  // Pro on one version of an exam covers its others (Security+ SY0-701 and
  // SY0-801), so those are never offered as an exam to buy.
  const coveredSlugs = new Set(enrolledCerts.flatMap((c) => [c.slug, ...otherVersions(c.slug)]));
  const otherCerts = allCerts.filter((c) => !enrolledIds.has(c.id) && !coveredSlugs.has(c.slug));

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">{isPro || pastDue ? "Your plan" : "CertBench Pro"}</h1>
        {!pastDue && (
          <p className="text-small text-muted-foreground">
            {isPro
              ? "You have CertBench Pro. Thank you for supporting CertBench."
              : "Pro opens the whole study path for the certification that you are studying."}
          </p>
        )}
      </div>

      {pastDue && (
        <div className="glass grid gap-4 rounded-lg p-5">
          <p className="cb-measure text-small">
            <strong className="font-semibold">Your last payment did not go through.</strong> Please update your
            payment method to keep CertBench Pro.
          </p>
          <ManageBillingButton variant="default" />
        </div>
      )}

      {added && (
        <p role="status" className="rounded-lg border border-input bg-card px-4 py-3 text-small">
          The certification has been added to your plan. It may take a moment to appear.
        </p>
      )}

      {reasonText && !pastDue && (
        <p className="rounded-lg border border-input bg-card px-4 py-3 text-small">{reasonText}</p>
      )}

      {isPro ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h2">{enrolledCerts.length > 1 ? "Your certifications" : "Your certification"}</CardTitle>
              <CardDescription>
                Pro covers everything for {enrolledCerts.length > 1 ? "these exams" : "this exam"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {enrolledCerts.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-border px-4 py-3 text-small"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.examCode}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {otherCerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Add a certification</CardTitle>
                <CardDescription>
                  If you are studying for more than one exam, you can add another to your plan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {otherCerts.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-small"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{c.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{c.examCode}</span>
                      </span>
                      <AddCertButton certId={c.id} price={pricing.prices.quarterly.discounted} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        !pastDue && (
          <Card>
            <CardHeader>
              <CardTitle as="h2">CertBench Pro</CardTitle>
              <CardDescription>The complete study path for the certification that you are studying.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2.5">
                <p className="text-small font-medium">Pro includes:</p>
                <ul className="grid list-disc gap-2 pl-5 text-small marker:text-muted-foreground">
                  {PRO_FEATURES.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <p className="text-small text-muted-foreground">
                <span className="font-medium text-foreground">Pass guarantee.</span> {PASS_GUARANTEE_TERMS}{" "}
                <Link href={PASS_GUARANTEE_HREF} className="cb-link">
                  Read the guarantee terms
                </Link>
                .
              </p>
              <PlanPicker initialPricing={pricing} />
            </CardContent>
          </Card>
        )
      )}

      {/* Every account that has a billing record can open it, with Pro or without:
          a member whose plan has ended may still need to reach the billing page. */}
      {plan.hasBillingAccount && !pastDue && <ManageBillingButton />}
    </div>
  );
}
