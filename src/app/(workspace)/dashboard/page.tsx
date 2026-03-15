import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardPlan } from "@/components/workspace/DashboardPlan";
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

  // If no cert param, redirect to the first active enrollment
  if (!certSlug) {
    const { data: firstEnrollment } = await supabase
      .from("user_enrollments")
      .select("certifications(slug)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    const slug = (firstEnrollment?.certifications as unknown as { slug: string } | null)?.slug;
    if (slug) {
      redirect(`/dashboard?cert=${slug}`);
    }
  }

  // Get certification and domains for the selected cert
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            {certification ? certification.name : "Dashboard"}
          </h1>
          {certification && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[14px] font-mono text-text-secondary">
                {certification.exam_code}
              </span>
              <span className="text-border">&middot;</span>
              <span className="text-[14px] text-text-secondary">
                {certification.vendor}
              </span>
            </div>
          )}
        </div>
        {certification && diagnosticComplete && (
          <div className="flex items-center gap-2">
            <Link href={`/certifications/${certification.slug}/exam`}>
              <Button variant="secondary" size="sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Practice Exam
              </Button>
            </Link>
            <Link href={`/certifications/${certification.slug}/srs`}>
              <Button variant="secondary" size="sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
                SRS Review
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* No certification selected */}
      {!certification && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-text-primary">
                No certification selected
              </p>
              <p className="text-[14px] text-text-secondary mt-1">
                Select a certification from the sidebar or enroll in one to get started.
              </p>
            </div>
            <Link href="/add-certification">
              <Button>Add Certification</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Pre-diagnostic state */}
      {certification && !diagnosticComplete && (
        <>
          {/* Diagnostic CTA */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-[18px] font-semibold text-text-primary">
                  Take your diagnostic exam
                </h2>
                <p className="text-[14px] text-text-secondary mt-1 max-w-lg">
                  Answer 25 questions across all domains so we can identify your strengths and gaps, then build a personalised study plan.
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[12px] text-text-muted flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    15–20 minutes
                  </span>
                  <span className="text-[12px] text-text-muted flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    25 questions
                  </span>
                </div>
              </div>
              <Link href={`/certifications/${certification.slug}/diagnostic`} className="shrink-0">
                <Button size="lg">Start Diagnostic</Button>
              </Link>
            </div>
          </Card>

          {/* Domain preview */}
          {domains && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-text-primary">
                  Exam Domains
                </h2>
                <Badge variant="neutral">
                  {domains.length} domains
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-bg-surface border border-border rounded-lg opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-8 h-8 rounded-md bg-bg-page border border-border flex items-center justify-center text-[12px] font-mono font-semibold text-text-muted">
                        {domain.domain_number}
                      </span>
                      <span className="text-[14px] text-text-primary truncate">
                        {domain.title}
                      </span>
                    </div>
                    <span className="text-[13px] font-mono text-text-muted tabular-nums shrink-0">
                      {domain.exam_weight}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-page rounded-lg border border-border">
                <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-[13px] text-text-muted">
                  Complete the diagnostic exam to unlock your readiness score and personalised study plan.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Post-diagnostic: full dashboard */}
      {certification && diagnosticComplete && (
        <DashboardPlan certSlug={certification.slug} />
      )}
    </div>
  );
}
