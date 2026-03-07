import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — CertBench",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get active enrollment for the selected cert
  let enrollment = null;
  let certification = null;
  let domains = null;

  if (certSlug) {
    const { data: certData } = await supabase
      .from("certifications")
      .select("*")
      .eq("slug", certSlug)
      .single();

    certification = certData;

    if (certification) {
      const { data: enrollmentData } = await supabase
        .from("user_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("certification_id", certification.id)
        .eq("is_active", true)
        .single();

      enrollment = enrollmentData;

      const { data: domainData } = await supabase
        .from("cert_domains")
        .select("*")
        .eq("certification_id", certification.id)
        .order("sort_order");

      domains = domainData;
    }
  }

  // Check if diagnostic has been completed
  let diagnosticComplete = false;
  if (certification) {
    const { data: diagnostic } = await supabase
      .from("diagnostic_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("certification_id", certification.id)
      .eq("is_complete", true)
      .limit(1);

    diagnosticComplete = (diagnostic?.length || 0) > 0;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          {certification ? certification.name : "Dashboard"}
        </h1>
        {certification && (
          <p className="text-[15px] text-text-secondary mt-1">
            {certification.exam_code} &middot; {certification.vendor}
          </p>
        )}
      </div>

      {!certification && (
        <Card padding="lg">
          <p className="text-[15px] text-text-secondary">
            Select a certification from the sidebar to view your study plan.
          </p>
        </Card>
      )}

      {certification && !diagnosticComplete && (
        <>
          {/* Diagnostic CTA */}
          <Card accent="primary" padding="lg">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-[18px] font-semibold text-text-primary">
                  Take your diagnostic exam
                </h2>
                <p className="text-[15px] text-text-secondary mt-1">
                  Answer 25 questions across all domains so we can build your
                  personalised study plan. This typically takes 15-20 minutes.
                </p>
              </div>
              <div>
                <Link
                  href={`/certifications/${certification.slug}/diagnostic`}
                >
                  <Button size="lg">Start Diagnostic</Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Locked Preview */}
          {domains && (
            <div>
              <h2 className="text-[18px] font-semibold text-text-primary mb-4">
                Exam Domains
              </h2>
              <div className="flex flex-col gap-3">
                {domains.map((domain) => (
                  <Card key={domain.id} className="opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-text-primary">
                          {domain.domain_number} {domain.title}
                        </p>
                      </div>
                      <span className="text-[14px] font-mono text-text-muted">
                        {domain.exam_weight}%
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
              <p className="text-[13px] text-text-muted mt-3">
                Complete the diagnostic exam to unlock your readiness score and
                personalised study plan.
              </p>
            </div>
          )}
        </>
      )}

      {certification && diagnosticComplete && (
        <Card padding="lg">
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">
            Your study plan
          </h2>
          <p className="text-[15px] text-text-secondary">
            Session engine will be implemented in Phase 3. Your personalised
            daily study blocks will appear here.
          </p>
        </Card>
      )}
    </div>
  );
}
